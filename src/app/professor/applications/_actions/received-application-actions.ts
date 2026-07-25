"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  DecideTopicApplicationService,
  TopicApplicationDecisionConflictError,
  TopicApplicationDecisionForbiddenError,
  TopicApplicationNotFoundError,
  TopicApplicationReviewCommentError,
} from "@/modules/topic-application/application/decide-topic-application";
import { PrismaTopicApplicationDecisionRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-decision-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type DecisionActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function decideTopicApplicationAction(
  _previousState: DecisionActionState,
  formData: FormData,
): Promise<DecisionActionState> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const parsed = z
    .object({
      applicationId: z.string().uuid(),
      decision: z.enum(["accept", "reject"]),
      reviewComment: z.string().max(2_000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "잘못된 지원서 처리 요청입니다." };
  }

  const service = new DecideTopicApplicationService(
    new PrismaTopicApplicationDecisionRepository(prisma),
  );
  try {
    if (parsed.data.decision === "accept") {
      await service.accept(actor, parsed.data.applicationId, parsed.data.reviewComment);
    } else {
      await service.reject(actor, parsed.data.applicationId, parsed.data.reviewComment);
    }
  } catch (error) {
    if (
      error instanceof TopicApplicationNotFoundError ||
      error instanceof TopicApplicationDecisionForbiddenError ||
      error instanceof TopicApplicationDecisionConflictError ||
      error instanceof TopicApplicationReviewCommentError
    ) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/professor/applications");
  revalidatePath(`/professor/applications/${parsed.data.applicationId}`);
  return {
    status: "success",
    message: parsed.data.decision === "accept" ? "지원서를 수락했습니다." : "지원서를 거절했습니다.",
  };
}
