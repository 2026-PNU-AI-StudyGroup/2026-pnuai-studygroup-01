"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ProjectProgramOperationError, ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { koreanLocalDateTime } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProgramActionState = { status: "idle" | "error" | "success"; message: string };
async function actor() { const value = await getCurrentActor(); if (!value) redirect("/sign-in"); return value; }
const service = () => new ProjectProgramService(new PrismaProjectProgramRepository(prisma));

export async function createProgramAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({ name: z.string(), category: z.string(), description: z.string(), startsAt: koreanLocalDateTime, endsAt: koreanLocalDateTime, advisorEnabled: z.enum(["true", "false"]).transform((value) => value === "true"), studentProjectCreationEnabled: z.boolean() }).safeParse({
    ...Object.fromEntries(formData),
    studentProjectCreationEnabled: formData.get("studentProjectCreationEnabled") === "true",
  });
  if (!parsed.success) return { status: "error", message: "프로그램 내용과 운영 기간을 확인해 주세요." };
  try { await service().create(await actor(), parsed.data); }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/admin/programs"); return { status: "success", message: "프로그램 초안을 등록했습니다." };
}

export async function changeStudentProjectCreationAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({ programId: z.string().min(1).max(200), enabled: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "학생 프로젝트 제안 설정을 다시 확인해 주세요." };
  try { await service().changeStudentProjectCreation(await actor(), parsed.data.programId, parsed.data.enabled === "true"); }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/admin/programs"); revalidatePath("/topics"); revalidatePath("/projects/new");
  return { status: "success", message: parsed.data.enabled === "true" ? "학생 프로젝트 제안을 허용했습니다." : "학생 프로젝트 제안을 중지했습니다." };
}

export async function changeProgramStatusAction(_state: ProgramActionState, formData: FormData): Promise<ProgramActionState> {
  const parsed = z.object({ programId: z.string().min(1).max(200), status: z.enum(["OPEN", "CLOSED"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "변경할 프로그램 상태를 다시 확인해 주세요." };
  try { await service().changeStatus(await actor(), parsed.data.programId, parsed.data.status); }
  catch (error) { if (error instanceof InvalidProjectProgramError || error instanceof ProjectProgramOperationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/admin/programs"); revalidatePath("/topics"); return { status: "success", message: parsed.data.status === "OPEN" ? "프로그램을 공개했습니다." : "프로그램을 마감했습니다." };
}
