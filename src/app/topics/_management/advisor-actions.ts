"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { AdvisorAdminService, AdvisorOperationError } from "@/modules/advisor/application/manage-advisors";
import { PrismaAdvisorAdminRepository } from "@/modules/advisor/infrastructure/prisma-advisor-admin-repository";
import { programManagementHref } from "@/modules/project-program/ui/program-management-route";
import { userIdSchema } from "@/modules/identity/domain/user-id";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type AdvisorActionState = { status: "idle" | "error" | "success"; message: string; inviteLink?: string };

function service() {
  return new AdvisorAdminService(new PrismaAdvisorAdminRepository(prisma));
}

function inviteLink(token: string) {
  return `/advisor-access/${token}`;
}

const registerSchema = z.object({ programId: z.string().uuid(), name: z.string().trim().min(1).max(100), email: z.string().email() });

export async function registerAdvisorAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "자문위원 이름과 이메일을 확인해 주세요." };
  try {
    const result = await service().invite(actor, {
      programId: parsed.data.programId,
      name: parsed.data.name,
      email: parsed.data.email,
    });
    revalidatePath(programManagementHref(parsed.data.programId, "advisors"));
    return {
      status: "success",
      // 다른 프로그램에서 쓰던 계정이면 폼에 적은 이름 대신 그 계정 이름이 그대로 쓰인다.
      // 말없이 넘어가면 운영자는 이름이 잘못 들어간 줄 안다.
      message: result.reusedAccount
        ? "다른 프로그램에 있던 자문위원을 이 프로그램에도 초대했습니다. 이름은 기존 계정 것을 씁니다. 초대 링크를 복사해 전달하세요."
        : "자문위원을 이 프로그램에 초대했습니다. 초대 링크를 복사해 전달하세요.",
      inviteLink: inviteLink(result.inviteToken),
    };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

const targetSchema = z.object({ programId: z.string().uuid(), userId: userIdSchema });

export async function reissueAdvisorTokenAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = targetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "재발급할 자문위원을 확인해 주세요." };
  try {
    const token = await service().reissueToken(actor, parsed.data);
    revalidatePath(programManagementHref(parsed.data.programId, "advisors"));
    return { status: "success", message: "초대 링크를 재발급했습니다.", inviteLink: inviteLink(token) };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function revokeAdvisorTokenAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = targetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "회수할 자문위원을 확인해 주세요." };
  try {
    await service().revoke(actor, parsed.data);
    revalidatePath(programManagementHref(parsed.data.programId, "advisors"));
    return { status: "success", message: "이 프로그램 초대를 회수했습니다. 담당 팀 배정도 함께 해제했습니다." };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function assignAdvisorTeamsAction(_state: AdvisorActionState, formData: FormData): Promise<AdvisorActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = targetSchema.safeParse({ programId: formData.get("programId"), userId: formData.get("userId") });
  if (!parsed.success) return { status: "error", message: "할당할 팀을 확인해 주세요." };
  const topicIds = formData.getAll("topicIds").filter((value): value is string => typeof value === "string" && value.length > 0);
  try {
    await service().assignTeams(actor, { userId: parsed.data.userId, programId: parsed.data.programId, topicIds });
    revalidatePath(programManagementHref(parsed.data.programId, "advisors"));
    return { status: "success", message: "팀 할당을 저장했습니다." };
  } catch (error) {
    if (error instanceof AdvisorOperationError) return { status: "error", message: error.message };
    throw error;
  }
}
