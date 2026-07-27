"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
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
  TeamDiscussionService,
  TeamMilestoneService,
  TeamNotFoundError,
} from "@/modules/team/application/manage-team-workspace";
import {
  InvalidDiscussionPostError,
  InvalidMilestoneError,
} from "@/modules/team/domain/team-workspace-policy";
import { PrismaTeamCloseRepository } from "@/modules/team/infrastructure/prisma-team-close-repository";
import { PrismaTeamConfirmationRepository } from "@/modules/team/infrastructure/prisma-team-confirmation-repository";
import { PrismaTeamDiscussionRepository } from "@/modules/team/infrastructure/prisma-team-discussion-repository";
import { PrismaTeamMilestoneRepository } from "@/modules/team/infrastructure/prisma-team-milestone-repository";
import {
  discussionPostInputSchema,
  milestoneInputSchema,
  milestoneStatusInputSchema,
} from "@/modules/team/ui/team-workspace-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TeamActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function confirmTeamAction(formData: FormData) {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const teamId = formData.get("teamId");
  if (typeof teamId !== "string") return;
  try {
    await new ConfirmTeamService(
      new PrismaTeamConfirmationRepository(prisma),
    ).confirm(actor, teamId);
  } catch (error) {
    if (error instanceof TeamConfirmationNotAllowedError) return;
    throw error;
  }
  revalidatePath(`/teams/${teamId}`, "layout");
  revalidatePath("/dashboard");
}

export async function closeTeamAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const teamId = formData.get("teamId");
  if (typeof teamId !== "string") {
    return { status: "error", message: "팀 종료 요청을 확인해 주세요." };
  }
  try {
    await new CloseTeamService(new PrismaTeamCloseRepository(prisma)).close(actor, teamId);
  } catch (error) {
    if (error instanceof TeamCloseNotAllowedError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath(`/teams/${teamId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/topics");
  return { status: "success", message: "팀을 종료하고 지난 프로젝트에 보관했습니다." };
}

function milestoneService() {
  return new TeamMilestoneService(new PrismaTeamMilestoneRepository(prisma));
}

function discussionService() {
  return new TeamDiscussionService(new PrismaTeamDiscussionRepository(prisma));
}

function expectedMessage(error: unknown): string | null {
  return error instanceof TeamNotFoundError ||
    error instanceof MilestoneNotFoundError ||
    error instanceof InvalidDiscussionPostError ||
    error instanceof InvalidMilestoneError
    ? error.message
    : null;
}

export async function createMilestoneAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = milestoneInputSchema.safeParse({
    ...Object.fromEntries(formData),
    assigneeIds: formData.getAll("assigneeIds"),
  });
  if (!parsed.success) {
    return { status: "error", message: "마일스톤 입력을 확인해 주세요." };
  }
  try {
    await milestoneService().createMilestone(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
  revalidatePath("/dashboard");
  return { status: "success", message: "마일스톤을 추가했습니다." };
}

export async function updateMilestoneStatusAction(
  _state: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = milestoneStatusInputSchema.safeParse(
    {
      ...Object.fromEntries(formData),
      assigneeIds: formData.getAll("assigneeIds"),
    },
  );
  if (!parsed.success) {
    return { status: "error", message: "잘못된 상태 변경 요청입니다." };
  }
  try {
    const result = await milestoneService().updateMilestoneStatus(actor, parsed.data);
    revalidatePath(`/teams/${result.teamId}`, "layout");
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidatePath("/dashboard");
  return { status: "success", message: "마일스톤 상태를 변경했습니다." };
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
  revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
  return { status: "success", message: "메시지를 보냈습니다." };
}
