"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import {
  ApplyToTopicService,
  StudentAlreadyInProjectError,
  TeamLeaderRequiredError,
  TeamMemberUnavailableError,
  TopicAlreadyAppliedError,
  TopicUnavailableForApplicationError,
} from "@/modules/topic-application/application/apply-to-topic";
import {
  InvalidTopicApplicationAnswersError,
  TopicApplicationKindForbiddenError,
  TopicApplicationForbiddenError,
} from "@/modules/topic-application/domain/topic-application-policy";
import { PrismaTopicApplicationSubmissionRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-submission-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ApplyTopicActionState = {
  status: "idle" | "error" | "success";
  message: string;
  outcome?: "CREATED";
};

const inputSchema = z.object({
  topicId: z.string().uuid(),
  kind: z.enum(["INDIVIDUAL", "TEAM"]),
  studentTeamId: z.string().uuid().optional(),
});

export async function applyTopicAction(
  _previousState: ApplyTopicActionState,
  formData: FormData,
): Promise<ApplyTopicActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "지원 방식과 지원서 내용을 확인해 주세요.",
    };
  }
  const answers = [...formData.entries()]
    .filter(([name]) => name.startsWith("answer:"))
    .map(([name, value]) => ({ questionId: name.slice("answer:".length), value: String(value) }));
  const service = new ApplyToTopicService(
    new PrismaTopicApplicationSubmissionRepository(prisma),
  );
  try {
    const result = await service.execute(actor, { ...parsed.data, answers });
    return { status: "success", outcome: result.outcome, message: "프로젝트 지원이 접수되었습니다." };
  } catch (error) {
    if (
      error instanceof TopicAlreadyAppliedError ||
      error instanceof TopicUnavailableForApplicationError ||
      error instanceof StudentAlreadyInProjectError ||
      error instanceof TeamMemberUnavailableError ||
      error instanceof TeamLeaderRequiredError ||
      error instanceof TopicApplicationForbiddenError ||
      error instanceof InvalidTopicApplicationAnswersError ||
      error instanceof TopicApplicationKindForbiddenError
    ) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

}
