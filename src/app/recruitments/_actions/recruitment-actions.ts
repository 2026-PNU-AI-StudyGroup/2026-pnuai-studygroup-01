"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { StudentTeamRecruitmentCommandService, StudentTeamRecruitmentError } from "@/modules/student-team/application/manage-student-team-recruitment";
import { koreanLocalDateTime } from "@/modules/topic/ui/create-topic-input";
import { PrismaStudentTeamRecruitmentCommandRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-command-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RecruitmentActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fields?: {
    teamId?: string;
    title?: string;
    content?: string;
    requiredSkills?: string[];
    roleNeeded?: string;
    availability?: string;
    capacity?: number;
    deadlineAt?: string;
  };
};
const list = z.string().transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean));
const service = () => new StudentTeamRecruitmentCommandService(
  new PrismaStudentTeamRecruitmentCommandRepository(prisma),
);
async function actor() { const value = await getCurrentOperationalActor(); if (!value) redirect("/sign-in"); return value; }

export async function createRecruitmentPostAction(_state: RecruitmentActionState, formData: FormData): Promise<RecruitmentActionState> {
  const rawData = Object.fromEntries(formData);
  const teamId = typeof rawData.teamId === "string" ? rawData.teamId : undefined;
  const title = typeof rawData.title === "string" ? rawData.title : undefined;
  const content = typeof rawData.content === "string" ? rawData.content : undefined;
  const roleNeeded = typeof rawData.roleNeeded === "string" ? rawData.roleNeeded : undefined;
  const availability = typeof rawData.availability === "string" ? rawData.availability : undefined;
  const capacity = Number(rawData.capacity) || undefined;
  const deadlineAt = typeof rawData.deadlineAt === "string" ? rawData.deadlineAt : undefined;
  const requiredSkillsRaw = typeof rawData.requiredSkills === "string" ? rawData.requiredSkills : undefined;
  const requiredSkills = requiredSkillsRaw ? requiredSkillsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const fields = { teamId, title, content, requiredSkills, roleNeeded, availability, capacity, deadlineAt };

  const parsed = z.object({ teamId: z.string().uuid(), title: z.string(), content: z.string(), requiredSkills: list, roleNeeded: z.string(), availability: z.string(), capacity: z.coerce.number().int(), deadlineAt: koreanLocalDateTime }).safeParse(rawData);
  if (!parsed.success) return { status: "error", message: "모집 정보를 확인해 주세요.", fields };
  try { await service().createPost(await actor(), parsed.data); }
  catch (error) { if (error instanceof StudentTeamRecruitmentError) return { status: "error", message: error.message, fields }; throw error; }
  revalidatePath("/recruitments"); revalidatePath("/recruitments/mine"); return { status: "success", message: "모집 글을 등록했습니다." };
}

export async function applyRecruitmentAction(_state: RecruitmentActionState, formData: FormData): Promise<RecruitmentActionState> {
  const parsed = z.object({ postId: z.string().uuid(), message: z.string(), skills: list, desiredRole: z.string(), availability: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "입력값을 확인해 주세요." };
  try { await service().apply(await actor(), parsed.data); }
  catch (error) { if (error instanceof StudentTeamRecruitmentError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/recruitments"); return { status: "success", message: "모집 글에 지원했습니다." };
}

export async function decideRecruitmentAction(_state: RecruitmentActionState, formData: FormData): Promise<RecruitmentActionState> {
  const parsed = z.object({ applicationId: z.string().uuid(), postId: z.string().uuid(), decision: z.enum(["ACCEPT", "REJECT"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "처리할 팀원 지원 결과를 다시 확인해 주세요." };
  try { await service().decide(await actor(), parsed.data.applicationId, parsed.data.decision); }
  catch (error) { if (error instanceof StudentTeamRecruitmentError) return { status: "error", message: error.message }; throw error; }
  revalidatePath(`/recruitments/${parsed.data.postId}/applications`);
  revalidatePath("/recruitments/mine");
  return { status: "success", message: parsed.data.decision === "ACCEPT" ? "팀원 지원을 수락했습니다." : "팀원 지원을 거절했습니다." };
}
