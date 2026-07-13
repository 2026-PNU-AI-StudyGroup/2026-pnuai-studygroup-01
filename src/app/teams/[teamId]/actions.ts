"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  MilestoneNotFoundError,
  TeamNotFoundError,
  TeamWorkspaceService,
} from "@/modules/team/application/manage-team-workspace";
import {
  InvalidMilestoneError,
  InvalidProgressUpdateError,
} from "@/modules/team/domain/team-workspace-policy";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import {
  milestoneInputSchema,
  milestoneStatusInputSchema,
  progressUpdateInputSchema,
} from "@/modules/team/ui/team-workspace-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TeamActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function service() {
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  return new TeamWorkspaceService(
    repository,
    repository,
    repository,
  );
}

function expectedMessage(error: unknown): string | null {
  return error instanceof TeamNotFoundError ||
    error instanceof MilestoneNotFoundError ||
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
