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
  const topicId = topicSchema.safeParse(formData.get("topicId"));
  if (!topicId.success) return { status: "error", message: "프로젝트를 찾을 수 없습니다." };
  const scores: Array<{ criterionId: string; points: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score-")) continue;
    const points = z.coerce.number().int().min(0).safeParse(value);
    if (!points.success) return { status: "error", message: "점수는 0부터 항목 배점까지만 입력할 수 있습니다." };
    scores.push({ criterionId: key.slice("score-".length), points: points.data });
  }
  try {
    await service().saveScores(actor, { topicId: topicId.data, scores });
    revalidatePath(`/advisor/${topicId.data}`);
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
