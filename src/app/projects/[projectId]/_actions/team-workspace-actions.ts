"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import {
  ConfirmTeamService,
  TeamConfirmationNotAllowedError,
} from "@/modules/team/application/confirm-team";
import {
  TaskNotFoundError,
  TeamDiscussionService,
  TeamTaskService,
  TeamNotFoundError,
} from "@/modules/team/application/manage-team-workspace";
import {
  InvalidDiscussionPostError,
  InvalidTaskError,
} from "@/modules/team/domain/team-workspace-policy";
import { PrismaTeamConfirmationRepository } from "@/modules/team/infrastructure/prisma-team-confirmation-repository";
import { PrismaTeamDiscussionRepository } from "@/modules/team/infrastructure/prisma-team-discussion-repository";
import { PrismaTeamTaskRepository } from "@/modules/team/infrastructure/prisma-team-task-repository";
import {
  discussionPostInputSchema,
  taskCompleteInputSchema,
  taskDeleteInputSchema,
  taskInputSchema,
  taskUpdateInputSchema,
} from "@/modules/team/ui/team-workspace-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TeamActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function confirmTeamAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const teamId = formData.get("teamId");
  if (typeof teamId !== "string") {
    return { status: "error", message: "팀 확정 요청을 확인해 주세요." };
  }
  try {
    await new ConfirmTeamService(
      new PrismaTeamConfirmationRepository(prisma),
    ).confirm(actor, teamId);
  } catch (error) {
    if (error instanceof TeamConfirmationNotAllowedError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/projects", "layout");
  revalidatePath("/dashboard");
  return { status: "success", message: "팀을 확정했습니다." };
}

function taskService() {
  return new TeamTaskService(new PrismaTeamTaskRepository(prisma));
}

function discussionService() {
  return new TeamDiscussionService(new PrismaTeamDiscussionRepository(prisma));
}

function expectedMessage(error: unknown): string | null {
  return error instanceof TeamNotFoundError ||
    error instanceof TaskNotFoundError ||
    error instanceof InvalidDiscussionPostError ||
    error instanceof InvalidTaskError
    ? error.message
    : null;
}

export async function createTaskAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = taskInputSchema.safeParse({
    ...Object.fromEntries(formData),
    assigneeIds: formData.getAll("assigneeIds"),
  });
  if (!parsed.success) {
    return { status: "error", message: "할 일 입력을 확인해 주세요." };
  }
  try {
    await taskService().createTask(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/projects", "layout");
  revalidatePath("/dashboard");
  return { status: "success", message: "할 일을 추가했습니다." };
}

export async function updateTaskAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = taskUpdateInputSchema.safeParse(
    {
      ...Object.fromEntries(formData),
      assigneeIds: formData.getAll("assigneeIds"),
    },
  );
  if (!parsed.success) {
    return { status: "error", message: "수정할 할 일 내용을 다시 확인해 주세요." };
  }
  try {
    await taskService().updateTask(actor, parsed.data);
    revalidatePath("/projects", "layout");
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/dashboard");
  return { status: "success", message: "할 일을 수정했습니다." };
}

export async function completeTaskAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = taskCompleteInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "완료할 할 일을 다시 확인해 주세요." };
  }
  try {
    await taskService().completeTask(actor, parsed.data.taskId);
    revalidatePath("/projects", "layout");
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/dashboard");
  return { status: "success", message: "할 일을 완료했습니다." };
}

export async function reopenTaskAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = taskCompleteInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "되돌릴 할 일을 다시 확인해 주세요." };
  }
  try {
    await taskService().reopenTask(actor, parsed.data.taskId);
    revalidatePath("/projects", "layout");
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/dashboard");
  return { status: "success", message: "할 일을 다시 할 일로 돌렸습니다." };
}

export async function deleteTaskAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = taskDeleteInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "삭제할 할 일을 다시 확인해 주세요." };
  }
  try {
    await taskService().deleteTask(actor, parsed.data.taskId);
    revalidatePath("/projects", "layout");
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/dashboard");
  return { status: "success", message: "할 일을 삭제했습니다." };
}

export async function createDiscussionPostAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = discussionPostInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "메시지 내용을 확인해 주세요." };
  try {
    await discussionService().createDiscussionPost(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/projects", "layout");
  return { status: "success", message: "메시지를 보냈습니다." };
}
