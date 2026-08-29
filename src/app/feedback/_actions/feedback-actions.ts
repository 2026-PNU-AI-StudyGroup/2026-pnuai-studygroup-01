"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import {
  checkFeedbackRateLimit,
  feedbackClientKey,
} from "@/app/feedback/_lib/feedback-rate-limit";

import {
  FEEDBACK_AREAS,
  type FeedbackActionState,
  FEEDBACK_LIMITS,
  FEEDBACK_PRIORITY_VALUES,
  type FeedbackPriorityValue,
  FEEDBACK_TYPE_VALUES,
  type FeedbackTypeValue,
  TARGET_SCREEN_VALUES,
  type TargetScreenValue,
} from "@/app/feedback/_lib/feedback-options";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

const idSchema = z.string().uuid();

// 글쓴이 이름은 받지 않는다. 자유 입력이라 아무나 교수 이름을 적어 사칭할 수 있었고,
// 로그인 없이 열린 게시판에서 실명이 그대로 공개됐다. 새 글은 익명으로만 남는다.
// (이미 등록된 글의 이름은 사용자가 직접 적어 넣은 값이라 건드리지 않는다.)
const ANONYMOUS_AUTHOR = "익명";

const postSchema = z.object({
  targetScreen: z.enum(TARGET_SCREEN_VALUES as [string, ...string[]]),
  area: z.enum(FEEDBACK_AREAS as unknown as [string, ...string[]]),
  type: z.enum(FEEDBACK_TYPE_VALUES as [string, ...string[]]),
  priority: z.enum(FEEDBACK_PRIORITY_VALUES as [string, ...string[]]),
  title: z.string().trim().min(1).max(FEEDBACK_LIMITS.title),
  body: z.string().trim().min(1).max(FEEDBACK_LIMITS.body),
});

const commentSchema = z.object({ body: z.string().trim().min(1).max(FEEDBACK_LIMITS.comment) });

async function getFeedbackModerator() {
  const actor = await getCurrentActor();
  return actor && (actor.role === "ADMIN" || actor.role === "PROFESSOR") ? actor : null;
}

export async function createFeedbackPostAction(
  _previous: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const client = feedbackClientKey(await headers());
  const rate = checkFeedbackRateLimit(client);
  if (!rate.allowed) {
    return {
      status: "error",
      message: `등록이 너무 잦습니다. ${rate.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
    };
  }
  const parsed = postSchema.safeParse({
    targetScreen: formData.get("targetScreen"),
    area: formData.get("area"),
    type: formData.get("type"),
    priority: formData.get("priority"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "error", message: "대상 화면·유형·우선순위·제목·내용을 모두 확인해 주세요." };
  }

  await prisma.feedbackPost.create({
    data: {
      ...parsed.data,
      authorName: ANONYMOUS_AUTHOR,
      targetScreen: parsed.data.targetScreen as TargetScreenValue,
      type: parsed.data.type as FeedbackTypeValue,
      priority: parsed.data.priority as FeedbackPriorityValue,
    },
  });
  revalidatePath("/feedback");
  return { status: "success", message: "피드백을 등록했습니다. 감사합니다." };
}

export async function addFeedbackCommentAction(
  postId: string,
  _previous: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const parsedId = idSchema.safeParse(postId);
  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!parsedId.success || !parsed.success) {
    return { status: "error", message: "답변 내용을 입력해 주세요." };
  }
  const actor = await getFeedbackModerator();
  if (!actor) return { status: "error", message: "피드백 답변은 관리자 또는 교수만 남길 수 있습니다." };

  await prisma.feedbackComment.create({
    data: { postId: parsedId.data, body: parsed.data.body, authorId: actor.id, authorName: actor.name },
  });
  revalidatePath("/feedback");
  return { status: "success", message: "코멘트를 남겼습니다." };
}

export async function toggleFeedbackResolvedAction(
  postId: string,
  resolve: boolean,
  _previous: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const parsedId = idSchema.safeParse(postId);
  if (!parsedId.success) return { status: "error", message: "피드백을 찾을 수 없습니다." };
  const actor = await getFeedbackModerator();
  if (!actor) return { status: "error", message: "상태 변경은 관리자 또는 교수만 할 수 있습니다." };
  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, FEEDBACK_LIMITS.comment) : null;
  const nextStatus = resolve ? "RESOLVED" : "OPEN";

  await prisma.$transaction([
    prisma.feedbackPost.update({
      where: { id: parsedId.data },
      data: resolve
        ? { status: "RESOLVED", resolvedAt: new Date(), resolvedById: actor.id, resolvedByName: actor.name }
        : { status: "OPEN", resolvedAt: null, resolvedById: null, resolvedByName: null },
    }),
    prisma.feedbackStatusChange.create({
      data: { postId: parsedId.data, status: nextStatus, changedById: actor.id, changedByName: actor.name, note },
    }),
  ]);
  revalidatePath("/feedback");
  return {
    status: "success",
    message: resolve ? "해결 처리했습니다." : "미해결로 되돌렸습니다.",
  };
}
