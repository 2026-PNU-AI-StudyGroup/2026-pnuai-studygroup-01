"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  CloseTeamService,
  TeamCloseNotAllowedError,
} from "@/modules/team/application/archive-projects";
import {
  ConfirmTeamService,
  TeamConfirmationNotAllowedError,
} from "@/modules/team/application/confirm-team";
import {
  MilestoneNotFoundError,
  TeamNotFoundError,
  TeamWorkspaceService,
} from "@/modules/team/application/manage-team-workspace";
import {
  InvalidDiscussionPostError,
  InvalidMilestoneError,
  InvalidProgressUpdateError,
} from "@/modules/team/domain/team-workspace-policy";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { PrismaTeamArchiveRepository } from "@/modules/team/infrastructure/prisma-team-archive-repository";
import {
  discussionPostInputSchema,
  milestoneInputSchema,
  milestoneStatusInputSchema,
  progressUpdateInputSchema,
} from "@/modules/team/ui/team-workspace-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TeamActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function confirmTeamAction(formData: FormData) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const teamId = formData.get("teamId");
  if (typeof teamId !== "string") return;
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  try {
    await new ConfirmTeamService(repository).confirm(actor, teamId);
  } catch (error) {
    if (error instanceof TeamConfirmationNotAllowedError) return;
    throw error;
  }
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard");
}

export async function closeTeamAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const teamId = formData.get("teamId");
  if (typeof teamId !== "string") {
    return { status: "error", message: "팀 종료 요청을 확인해 주세요." };
  }
  try {
    await new CloseTeamService(new PrismaTeamArchiveRepository(prisma)).close(actor, teamId);
  } catch (error) {
    if (error instanceof TeamCloseNotAllowedError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard");
  revalidatePath("/archive");
  return { status: "success", message: "팀을 종료하고 아카이브에 보관했습니다." };
}

function service() {
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  return new TeamWorkspaceService(
    repository,
    repository,
    repository,
    repository,
  );
}

function expectedMessage(error: unknown): string | null {
  return error instanceof TeamNotFoundError ||
    error instanceof MilestoneNotFoundError ||
    error instanceof InvalidDiscussionPostError ||
    error instanceof InvalidMilestoneError ||
    error instanceof InvalidProgressUpdateError
    ? error.message
    : null;
}

export async function createMilestoneAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = milestoneInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "마일스톤 입력을 확인해 주세요." };
  }
  try {
    await service().createMilestone(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath(`/teams/${parsed.data.teamId}`);
  revalidatePath("/dashboard");
  return { status: "success", message: "마일스톤을 추가했습니다." };
}

export async function updateMilestoneStatusAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = milestoneStatusInputSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { status: "error", message: "잘못된 상태 변경 요청입니다." };
  }
  try {
    const result = await service().updateMilestoneStatus(actor, parsed.data);
    revalidatePath(`/teams/${result.teamId}`);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/dashboard");
  return { status: "success", message: "마일스톤 상태를 변경했습니다." };
}

export async function createProgressUpdateAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = progressUpdateInputSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { status: "error", message: "진행 기록 입력을 확인해 주세요." };
  }
  try {
    await service().createProgressUpdate(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath(`/teams/${parsed.data.teamId}`);
  return { status: "success", message: "진행 기록을 추가했습니다." };
}

export async function createDiscussionPostAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = discussionPostInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "토론 내용을 확인해 주세요." };
  try {
    await service().createDiscussionPost(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath(`/teams/${parsed.data.teamId}`);
  return { status: "success", message: "토론 글을 등록했습니다." };
}
