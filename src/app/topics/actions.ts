"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  ApplyToTopicService,
  StudentAlreadyAssignedError,
  TopicAlreadyAppliedError,
  TopicUnavailableForApplicationError,
} from "@/modules/topic-application/application/apply-to-topic";
import {
  InvalidTopicApplicationMessageError,
  InvalidTopicApplicationProfileError,
  TopicApplicationForbiddenError,
} from "@/modules/topic-application/domain/topic-application-policy";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ApplyTopicActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const inputSchema = z.object({
  topicId: z.string().uuid(),
  message: z.string().min(1).max(2_000),
  skills: z.string().transform((value, context) => {
    const skills = [...new Set(value.split(",").map((skill) => skill.trim()).filter(Boolean))];
    if (skills.length === 0 || skills.length > 20 || skills.some((skill) => skill.length > 50)) {
      context.addIssue({ code: "custom", message: "보유 기술 형식을 확인해 주세요." });
      return z.NEVER;
    }
    return skills;
  }),
  desiredRole: z.string().min(1).max(500),
  availability: z.string().min(1).max(500),
});

export async function applyTopicAction(
  _previousState: ApplyTopicActionState,
  formData: FormData,
): Promise<ApplyTopicActionState> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "지원 메시지와 보유 기술, 희망 역할, 활동 가능 시간을 확인해 주세요.",
    };
  }

  const service = new ApplyToTopicService(
    new PrismaTopicApplicationRepository(prisma),
  );
  try {
    await service.execute(actor, parsed.data);
  } catch (error) {
    if (
      error instanceof TopicAlreadyAppliedError ||
      error instanceof TopicUnavailableForApplicationError ||
      error instanceof StudentAlreadyAssignedError ||
      error instanceof TopicApplicationForbiddenError ||
      error instanceof InvalidTopicApplicationMessageError ||
      error instanceof InvalidTopicApplicationProfileError
    ) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/topics");
  return { status: "success", message: "주제 지원이 접수되었습니다." };
}
