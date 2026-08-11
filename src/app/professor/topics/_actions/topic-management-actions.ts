"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  ChangeTopicStatusService,
  InvalidTopicStatusTransitionError,
  TopicManagementForbiddenError,
  TopicNotFoundError,
} from "@/modules/topic/application/change-topic-status";
import { PrismaTopicCommandRepository } from "@/modules/topic/infrastructure/prisma-topic-command-repository";
import { parseTopicFormData } from "@/modules/topic/ui/create-topic-input";
import { getCreateTopicErrorMessage } from "@/modules/topic/ui/create-topic-error";
import { TopicUpdateError, UpdateTopicService } from "@/modules/topic/application/update-topic";
import type { TopicFormActionState } from "@/modules/topic/ui/topic-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type TopicManagementActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export type TopicStatusActionState = TopicManagementActionState;

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
      intent: z.enum(["close", "closeRecruitment"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "변경할 프로젝트 상태를 다시 확인해 주세요." };
  }

  const service = new ChangeTopicStatusService(new PrismaTopicCommandRepository(prisma));

  try {
    if (parsed.data.intent === "close") {
      await service.close(actor, parsed.data.topicId);
    } else {
      await service.closeRecruitment(actor, parsed.data.topicId);
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
  revalidatePath(`/professor/topics/${parsed.data.topicId}`);
  revalidatePath("/topics");
  revalidatePath(`/topics/${parsed.data.topicId}`);
  return {
    status: "success",
    message: parsed.data.intent === "closeRecruitment"
        ? "프로젝트 모집을 마감했습니다."
        : "프로젝트가 마감되었습니다.",
  };
}

export async function updateTopicAction(
  _previousState: TopicFormActionState,
  formData: FormData,
): Promise<TopicFormActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const topicId = z.string().uuid().safeParse(formData.get("topicId"));
  const parsed = parseTopicFormData(formData);
  if (!topicId.success || !parsed.success) {
    return { status: "error", message: "프로젝트 내용을 확인해 주세요." };
  }
  try {
    await new UpdateTopicService(new PrismaTopicCommandRepository(prisma)).execute(actor, topicId.data, parsed.data);
  } catch (error) {
    if (error instanceof TopicUpdateError) return { status: "error", message: error.message };
    const message = getCreateTopicErrorMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/professor/topics");
  revalidatePath(`/professor/topics/${topicId.data}`);
  revalidatePath(`/professor/topics/${topicId.data}/edit`);
  revalidatePath("/topics");
  return { status: "success", message: "프로젝트 내용을 변경했습니다." };
}
