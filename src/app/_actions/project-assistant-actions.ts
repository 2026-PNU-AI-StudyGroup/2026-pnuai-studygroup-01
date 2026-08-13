"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  ProjectAssistantCommandService,
  ProjectAssistantOperationError,
} from "@/modules/project-assistant/application/manage-project-assistants";
import { PrismaProjectAssistantRepository } from "@/modules/project-assistant/infrastructure/prisma-project-assistant-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProjectAssistantActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const idle: ProjectAssistantActionState = { status: "idle", message: "" };

function projectAssistantService() {
  return new ProjectAssistantCommandService(
    new PrismaProjectAssistantRepository(prisma),
  );
}

function refresh(topicId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/professor/topics");
  revalidatePath("/professor/applications");
  // 조교 관리 패널은 팀 워크스페이스에도 렌더된다. 폼이 teamId를 싣지 않으므로
  // 동적 팀 경로 전체를 무효화해 stale UI를 막는다.
  revalidatePath("/projects", "layout");
  if (topicId) {
    revalidatePath(`/professor/topics/${topicId}`);
  }
}

export async function inviteProjectAssistantAction(
  _state: ProjectAssistantActionState = idle,
  formData: FormData,
): Promise<ProjectAssistantActionState> {
  void _state;
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    topicId: z.string().uuid(),
    email: z.string().max(320),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "초대 정보를 확인해 주세요." };
  try {
    await projectAssistantService().invite(actor, parsed.data);
  } catch (error) {
    if (error instanceof ProjectAssistantOperationError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  refresh(parsed.data.topicId);
  return { status: "success", message: "프로젝트 조교 초대를 보냈습니다." };
}

export async function respondProjectAssistantInvitationAction(
  _state: ProjectAssistantActionState = idle,
  formData: FormData,
): Promise<ProjectAssistantActionState> {
  void _state;
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    invitationId: z.string().uuid(),
    decision: z.enum(["ACCEPT", "DECLINE"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "초대 응답을 확인해 주세요." };
  try {
    await projectAssistantService().respond(actor, parsed.data.invitationId, parsed.data.decision);
  } catch (error) {
    if (error instanceof ProjectAssistantOperationError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  refresh();
  return {
    status: "success",
    message: parsed.data.decision === "ACCEPT"
      ? "조교 초대를 수락했습니다."
      : "조교 초대를 거절했습니다.",
  };
}

export async function cancelProjectAssistantInvitationAction(
  _state: ProjectAssistantActionState = idle,
  formData: FormData,
): Promise<ProjectAssistantActionState> {
  void _state;
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    invitationId: z.string().uuid(),
    topicId: z.string().uuid(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "취소할 초대 정보를 확인해 주세요." };
  try {
    await projectAssistantService().cancelInvitation(actor, parsed.data.invitationId);
  } catch (error) {
    if (error instanceof ProjectAssistantOperationError) return { status: "error", message: error.message };
    throw error;
  }
  refresh(parsed.data.topicId);
  return { status: "success", message: "조교 초대를 취소했습니다." };
}

export async function removeProjectAssistantAction(
  _state: ProjectAssistantActionState = idle,
  formData: FormData,
): Promise<ProjectAssistantActionState> {
  void _state;
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    topicId: z.string().uuid(),
    assistantUserId: z.string().min(1),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "해제할 조교 정보를 확인해 주세요." };
  try {
    await projectAssistantService().remove(actor, parsed.data.topicId, parsed.data.assistantUserId);
  } catch (error) {
    if (error instanceof ProjectAssistantOperationError) return { status: "error", message: error.message };
    throw error;
  }
  refresh(parsed.data.topicId);
  return { status: "success", message: "조교 권한을 해제했습니다." };
}
