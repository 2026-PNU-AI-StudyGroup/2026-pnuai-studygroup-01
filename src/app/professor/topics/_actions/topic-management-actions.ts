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
import {
  AdminProjectLifecycleError,
  ManageAdminProjectLifecycleService,
} from "@/modules/topic/application/manage-admin-project-lifecycle";
import { PrismaAdminProjectLifecycleWriter } from "@/modules/topic/infrastructure/prisma-admin-project-lifecycle-writer";
import {
  DeleteProjectError,
  DeleteProjectService,
} from "@/modules/topic/application/delete-project";
import { PrismaProjectDeletionRepository } from "@/modules/topic/infrastructure/prisma-project-deletion-repository";

type TopicManagementActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export type TopicStatusActionState = TopicManagementActionState;
export type AdminProjectLifecycleActionState = TopicManagementActionState;
export type ProjectDeleteActionState = TopicManagementActionState;

export async function deleteProjectAction(
  _previousState: TopicManagementActionState,
  formData: FormData,
): Promise<TopicManagementActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    topicId: z.string().uuid(),
    reason: z.string(),
    confirmedTitle: z.string(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "삭제 내용을 다시 확인해 주세요." };
  try {
    await new DeleteProjectService(
      new PrismaProjectDeletionRepository(prisma),
    ).execute(actor, {
      projectId: parsed.data.topicId,
      reason: parsed.data.reason,
      confirmedTitle: parsed.data.confirmedTitle,
    });
  } catch (error) {
    if (error instanceof DeleteProjectError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/professor/topics");
  revalidatePath("/topics");
  redirect("/professor/topics");
}

export async function adminProjectLifecycleAction(
  _previousState: AdminProjectLifecycleActionState,
  formData: FormData,
): Promise<AdminProjectLifecycleActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    topicId: z.string().uuid(),
    intent: z.literal("REQUEST_REVIEW"),
    reason: z.string(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "변경 내용을 다시 확인해 주세요." };
  try {
    await new ManageAdminProjectLifecycleService(
      new PrismaAdminProjectLifecycleWriter(prisma),
    ).execute(actor, {
      projectId: parsed.data.topicId,
      intent: parsed.data.intent,
      reason: parsed.data.reason,
    });
  } catch (error) {
    if (error instanceof AdminProjectLifecycleError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/professor/topics");
  revalidatePath(`/professor/topics/${parsed.data.topicId}`);
  revalidatePath("/topics");
  revalidatePath("/dashboard");
  return { status: "success", message: "프로젝트 상태를 변경했습니다." };
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
      intent: z.literal("closeRecruitment"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "변경할 프로젝트 상태를 다시 확인해 주세요." };
  }

  const service = new ChangeTopicStatusService(new PrismaTopicCommandRepository(prisma));

  try {
    await service.closeRecruitment(actor, parsed.data.topicId);
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
    message: "프로젝트 모집을 마감했습니다.",
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
