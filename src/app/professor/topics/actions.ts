"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { CreateTopicService } from "@/modules/topic/application/create-topic";
import {
  ChangeTopicStatusService,
  InvalidTopicStatusTransitionError,
  TopicManagementForbiddenError,
  TopicNotFoundError,
} from "@/modules/topic/application/change-topic-status";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { getCreateTopicErrorMessage } from "@/modules/topic/ui/create-topic-error";
import { createTopicInputSchema } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type CreateTopicActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export type TopicStatusActionState = CreateTopicActionState;

export async function createTopicAction(
  _previousState: CreateTopicActionState,
  formData: FormData,
): Promise<CreateTopicActionState> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const parsed = createTopicInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "주제 내용과 기간을 확인해 주세요." };
  }

  const cycleRepository = new PrismaAcademicCycleRepository(prisma);
  const topicRepository = new PrismaTopicRepository(prisma);
  const service = new CreateTopicService(topicRepository, cycleRepository);

  try {
    await service.execute(actor, parsed.data);
  } catch (error) {
    const message = getCreateTopicErrorMessage(error);
    if (message) {
      return { status: "error", message };
    }
    throw error;
  }

  revalidatePath("/professor/topics");
  return { status: "success", message: "주제 초안이 저장되었습니다." };
}

export async function changeTopicStatusAction(
  _previousState: TopicStatusActionState,
  formData: FormData,
): Promise<TopicStatusActionState> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const parsed = z
    .object({
      topicId: z.string().uuid(),
      intent: z.enum(["publish", "close"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "잘못된 상태 변경 요청입니다." };
  }

  const service = new ChangeTopicStatusService(
    new PrismaTopicRepository(prisma),
  );

  try {
    if (parsed.data.intent === "publish") {
      await service.publish(actor, parsed.data.topicId);
    } else {
      await service.close(actor, parsed.data.topicId);
    }
  } catch (error) {
    if (
      error instanceof TopicNotFoundError ||
      error instanceof TopicManagementForbiddenError ||
      error instanceof InvalidTopicStatusTransitionError
    ) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/professor/topics");
  return {
    status: "success",
    message: parsed.data.intent === "publish" ? "주제가 공개되었습니다." : "주제가 마감되었습니다.",
  };
}
