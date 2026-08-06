"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
import { prisma } from "@/shared/infrastructure/database/prisma";

const name = z.string().trim().min(1).max(FEEDBACK_LIMITS.name);
const idSchema = z.string().uuid();

const postSchema = z.object({
  authorName: name,
  targetScreen: z.enum(TARGET_SCREEN_VALUES as [string, ...string[]]),
  area: z.enum(FEEDBACK_AREAS as unknown as [string, ...string[]]),
  type: z.enum(FEEDBACK_TYPE_VALUES as [string, ...string[]]),
  priority: z.enum(FEEDBACK_PRIORITY_VALUES as [string, ...string[]]),
  title: z.string().trim().min(1).max(FEEDBACK_LIMITS.title),
  body: z.string().trim().min(1).max(FEEDBACK_LIMITS.body),
});

const commentSchema = z.object({
  developerName: name,
  body: z.string().trim().min(1).max(FEEDBACK_LIMITS.comment),
});

export async function createFeedbackPostAction(
  _previous: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const parsed = postSchema.safeParse({
    authorName: formData.get("authorName"),
    targetScreen: formData.get("targetScreen"),
    area: formData.get("area"),
    type: formData.get("type"),
    priority: formData.get("priority"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "error", message: "이름·대상 화면·유형·우선순위·제목·내용을 모두 확인해 주세요." };
  }

  await prisma.feedbackPost.create({
    data: {
      ...parsed.data,
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
  const parsed = commentSchema.safeParse({
    developerName: formData.get("developerName"),
    body: formData.get("body"),
  });
  if (!parsedId.success || !parsed.success) {
    return { status: "error", message: "개발자 이름과 코멘트를 입력해 주세요." };
  }

  await prisma.feedbackComment.create({
    data: { postId: parsedId.data, ...parsed.data },
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
  const parsedName = name.safeParse(formData.get("developerName"));
  if (!parsedId.success || !parsedName.success) {
    return { status: "error", message: "개발자 이름을 입력해야 상태를 바꿀 수 있습니다." };
  }

  await prisma.feedbackPost.update({
    where: { id: parsedId.data },
    data: resolve
      ? { status: "RESOLVED", resolvedAt: new Date(), resolvedByName: parsedName.data }
      : { status: "OPEN", resolvedAt: null, resolvedByName: null },
  });
  revalidatePath("/feedback");
  return {
    status: "success",
    message: resolve ? "해결 처리했습니다." : "미해결로 되돌렸습니다.",
  };
}
