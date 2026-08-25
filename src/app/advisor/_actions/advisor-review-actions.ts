"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AdvisorOperationError, AdvisorReviewService } from "@/modules/advisor/application/advisor-review";
import { PrismaAdvisorReviewRepository } from "@/modules/advisor/infrastructure/prisma-advisor-review-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type AdvisorReviewState = { status: "idle" | "error" | "success"; message: string };

const topicSchema = z.string().uuid();

function service() {
  return new AdvisorReviewService(new PrismaAdvisorReviewRepository(prisma));
}

export async function saveAdvisorScoresAction(_state: AdvisorReviewState, formData: FormData): Promise<AdvisorReviewState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const target = z.object({ topicId: topicSchema, rubricId: topicSchema }).safeParse({ topicId: formData.get("topicId"), rubricId: formData.get("rubricId") });
  if (!target.success) return { status: "error", message: "채점표를 찾을 수 없습니다." };
  const scores: Array<{ criterionId: string; points: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score-")) continue;
    // 빈 칸이 0 으로 바뀌어 저장되면 채점하지 않은 항목이 0점으로 굳는다.
    // 숫자만 받는다. 화면 밖에서 보내는 요청도 같은 문을 지난다.
    const points = z.string().regex(/^\d+$/).transform(Number).safeParse(value);
    if (!points.success) return { status: "error", message: "점수는 0부터 항목 배점까지만 입력할 수 있습니다." };
    scores.push({ criterionId: key.slice("score-".length), points: points.data });
  }
  try {
    await service().saveScores(actor, { ...target.data, scores });
    revalidatePath(`/advisor/${target.data.topicId}`);
    return { status: "success", message: "점수를 저장했습니다." };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function addAdvisorFeedbackAction(_state: AdvisorReviewState, formData: FormData): Promise<AdvisorReviewState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({ topicId: topicSchema, body: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "피드백 내용을 확인해 주세요." };
  try {
    await service().addFeedback(actor, parsed.data);
    revalidatePath(`/advisor/${parsed.data.topicId}`);
    return { status: "success", message: "피드백을 등록했습니다." };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}
