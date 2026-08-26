"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProjectTeamInvitationRepository } from "@/modules/project-team/infrastructure/prisma-project-team-invitation-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProjectTeamInvitationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const INVITE_FAILURE_MESSAGE: Record<string, string> = {
  NOT_FOUND: "프로젝트 팀을 찾을 수 없습니다.",
  FORBIDDEN: "팀장과 지도교수, 관리자만 초대할 수 있습니다.",
  PROGRAM_CLOSED: "운영이 끝난 프로그램에는 초대할 수 없습니다.",
  NOT_INSTITUTION_EMAIL: "부산대학교 이메일만 초대할 수 있습니다.",
  ALREADY_MEMBER: "이미 이 프로젝트의 팀원입니다.",
  CAPACITY_REACHED: "정원이 가득 찼습니다. 보낸 초대를 철회하거나 정원을 늘려 주세요.",
};

export async function inviteProjectTeamMemberAction(
  _state: ProjectTeamInvitationActionState,
  formData: FormData,
): Promise<ProjectTeamInvitationActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    projectId: z.string().uuid(),
    projectTeamId: z.string().uuid(),
    email: z.string().trim().email().max(200),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "초대할 이메일을 확인해 주세요." };

  const outcome = await new PrismaProjectTeamInvitationRepository(prisma, actor).invite({
    projectTeamId: parsed.data.projectTeamId,
    actorId: actor.id,
    email: parsed.data.email,
    invitedAt: new Date(),
  });
  if (outcome.status !== "INVITED") {
    return { status: "error", message: INVITE_FAILURE_MESSAGE[outcome.status] ?? "초대를 보내지 못했습니다." };
  }
  revalidatePath(`/projects/${parsed.data.projectId}`, "layout");
  return { status: "success", message: "초대를 보냈습니다." };
}

export async function cancelProjectTeamInvitationAction(
  _state: ProjectTeamInvitationActionState,
  formData: FormData,
): Promise<ProjectTeamInvitationActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    projectId: z.string().uuid(),
    invitationId: z.string().uuid(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "초대 정보를 확인해 주세요." };

  const canceled = await new PrismaProjectTeamInvitationRepository(prisma, actor).cancel({
    invitationId: parsed.data.invitationId,
    actorId: actor.id,
    canceledAt: new Date(),
  });
  if (!canceled) return { status: "error", message: "초대를 철회하지 못했습니다." };
  revalidatePath(`/projects/${parsed.data.projectId}`, "layout");
  return { status: "success", message: "초대를 철회했습니다." };
}

const RESPOND_FAILURE_MESSAGE: Record<string, string> = {
  NOT_FOUND: "초대를 찾을 수 없습니다. 이미 처리되었을 수 있습니다.",
  PROGRAM_CLOSED: "운영이 끝난 프로그램이라 참여할 수 없습니다.",
  CAPACITY_REACHED: "정원이 가득 차 참여할 수 없습니다.",
};

export async function respondProjectTeamInvitationAction(
  _state: ProjectTeamInvitationActionState,
  formData: FormData,
): Promise<ProjectTeamInvitationActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    invitationId: z.string().uuid(),
    intent: z.enum(["ACCEPT", "DECLINE"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "초대 정보를 확인해 주세요." };

  const outcome = await new PrismaProjectTeamInvitationRepository(prisma, actor).respond({
    invitationId: parsed.data.invitationId,
    inviteeId: actor.id,
    inviteeEmail: actor.email,
    accept: parsed.data.intent === "ACCEPT",
    respondedAt: new Date(),
  });
  revalidatePath("/dashboard");
  revalidatePath("/projects", "layout");
  if (outcome === "ACCEPTED") return { status: "success", message: "프로젝트 팀에 참여했습니다." };
  if (outcome === "DECLINED") return { status: "success", message: "초대를 거절했습니다." };
  return { status: "error", message: RESPOND_FAILURE_MESSAGE[outcome] ?? "초대를 처리하지 못했습니다." };
}
