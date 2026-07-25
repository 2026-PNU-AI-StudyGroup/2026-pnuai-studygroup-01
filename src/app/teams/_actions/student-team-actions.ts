"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamOperationError, StudentTeamService } from "@/modules/student-team/application/manage-student-teams";
import { PrismaStudentTeamRepository } from "@/modules/student-team/infrastructure/prisma-student-team-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type StudentTeamActionState = { status: "idle" | "success" | "error"; message: string };

async function serviceAndActor() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  return { actor, service: new StudentTeamService(new PrismaStudentTeamRepository(prisma)) };
}

async function run(operation: () => Promise<void>, success: string): Promise<StudentTeamActionState> {
  try {
    await operation();
    revalidatePath("/teams");
    revalidatePath("/recruitments");
    return { status: "success", message: success };
  } catch (error) {
    if (error instanceof StudentTeamOperationError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function createStudentTeamAction(_state: StudentTeamActionState, formData: FormData): Promise<StudentTeamActionState> {
  const parsed = z.object({ name: z.string(), description: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "팀 정보를 확인해 주세요." };
  const { actor, service } = await serviceAndActor();
  return run(async () => { await service.create(actor, parsed.data); }, "팀을 만들었습니다.");
}

export async function inviteStudentTeamMemberAction(_state: StudentTeamActionState, formData: FormData): Promise<StudentTeamActionState> {
  const parsed = z.object({ teamId: z.string().uuid(), email: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "초대 정보를 확인해 주세요." };
  const { actor, service } = await serviceAndActor();
  return run(async () => { await service.invite(actor, parsed.data); }, "팀원 초대를 보냈습니다.");
}

export async function respondStudentTeamInvitationAction(_state: StudentTeamActionState, formData: FormData): Promise<StudentTeamActionState> {
  const parsed = z.object({ invitationId: z.string().uuid(), decision: z.enum(["ACCEPT", "DECLINE"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "초대 응답을 확인해 주세요." };
  const { actor, service } = await serviceAndActor();
  return run(async () => { await service.respond(actor, parsed.data.invitationId, parsed.data.decision); }, parsed.data.decision === "ACCEPT" ? "팀에 합류했습니다." : "초대를 거절했습니다.");
}

export async function transferStudentTeamLeadershipAction(_state: StudentTeamActionState, formData: FormData): Promise<StudentTeamActionState> {
  const parsed = z.object({ teamId: z.string().uuid(), nextLeaderId: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "새 팀장을 선택해 주세요." };
  const { actor, service } = await serviceAndActor();
  return run(async () => { await service.transferLeadership(actor, parsed.data.teamId, parsed.data.nextLeaderId); }, "팀장을 변경했습니다.");
}

export async function removeStudentTeamMemberAction(_state: StudentTeamActionState, formData: FormData): Promise<StudentTeamActionState> {
  const parsed = z.object({ teamId: z.string().uuid(), studentId: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "팀원을 확인해 주세요." };
  const { actor, service } = await serviceAndActor();
  return run(async () => { await service.removeMember(actor, parsed.data.teamId, parsed.data.studentId); }, "팀원을 내보냈습니다.");
}

export async function deleteStudentTeamAction(_state: StudentTeamActionState, formData: FormData): Promise<StudentTeamActionState> {
  const parsed = z.object({ teamId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "팀을 확인해 주세요." };
  const { actor, service } = await serviceAndActor();
  return run(async () => { await service.delete(actor, parsed.data.teamId); }, "팀을 삭제했습니다. 기존 프로젝트 기록은 유지됩니다.");
}
