"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { programManagementHref } from "@/modules/project-program/ui/program-management-route";
import { ProgramReportDefinitionService, type ProgramReportDefinitionOutcome } from "@/modules/report/application/manage-program-report-definitions";
import { PrismaProgramReportDefinitionRepository } from "@/modules/report/infrastructure/prisma-program-report-definition-repository";
import { koreanLocalDateTime } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProgramReportActionState = { status: "idle" | "error" | "success"; message: string };

const idSchema = z.string().uuid();
const service = () => new ProgramReportDefinitionService(new PrismaProgramReportDefinitionRepository(prisma));

async function admin() {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  return actor;
}

function parseDefinition(formData: FormData) {
  return z.object({ title: z.string().trim().min(1).max(100), dueAt: koreanLocalDateTime, required: z.enum(["true", "false"]).transform((value) => value === "true") }).safeParse({
    title: formData.get("title"),
    dueAt: formData.get("dueAt"),
    required: formData.get("required"),
  });
}

function refresh(programId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/topics");
  revalidatePath(programManagementHref(programId, "reports"));
}

export async function createProgramReportDefinitionAction(programId: string, _state: ProgramReportActionState, formData: FormData): Promise<ProgramReportActionState> {
  if (!idSchema.safeParse(programId).success) return error("프로그램을 확인해 주세요.");
  const parsed = parseDefinition(formData);
  if (!parsed.success) return error("보고서 제목과 제출 마감을 확인해 주세요.");
  try {
    const outcome = await service().create(await admin(), programId, parsed.data);
    const failure = outcomeMessage(outcome);
    if (failure) return error(failure);
    refresh(programId);
    return success("보고서를 프로그램의 현재 팀에 추가했습니다.");
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "보고서를 추가할 수 없습니다.");
  }
}

export async function updateProgramReportDefinitionAction(definitionId: string, programId: string, _state: ProgramReportActionState, formData: FormData): Promise<ProgramReportActionState> {
  const parsed = parseDefinition(formData);
  if (!idSchema.safeParse(definitionId).success || !parsed.success) return error("보고서 제목과 제출 마감을 확인해 주세요.");
  try {
    const outcome = await service().update(await admin(), programId, definitionId, parsed.data);
    const failure = outcomeMessage(outcome);
    if (failure) return error(failure);
    refresh(programId);
    return success("보고서 설정을 변경했습니다.");
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "보고서 설정을 변경할 수 없습니다.");
  }
}

export async function moveProgramReportDefinitionAction(definitionId: string, programId: string, direction: "up" | "down", _state: ProgramReportActionState): Promise<ProgramReportActionState> {
  void _state;
  if (!idSchema.safeParse(definitionId).success) return error("보고서를 확인해 주세요.");
  try {
    const outcome = await service().move(await admin(), programId, definitionId, direction);
    const failure = outcomeMessage(outcome);
    if (failure) return error(failure);
    refresh(programId);
    return success("");
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "보고서 순서를 변경할 수 없습니다.");
  }
}

export async function deleteProgramReportDefinitionAction(definitionId: string, programId: string, _state: ProgramReportActionState): Promise<ProgramReportActionState> {
  void _state;
  if (!idSchema.safeParse(definitionId).success) return error("보고서를 확인해 주세요.");
  try {
    const outcome = await service().delete(await admin(), programId, definitionId);
    const failure = outcomeMessage(outcome);
    if (failure) return error(failure);
    refresh(programId);
    return success("보고서를 삭제했습니다.");
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "보고서를 삭제할 수 없습니다.");
  }
}

function outcomeMessage(outcome: ProgramReportDefinitionOutcome) {
  if (outcome === "DUPLICATE") return "같은 이름의 활성 보고서가 이미 있습니다.";
  if (outcome === "NOT_FOUND") return "보고서 또는 프로그램을 찾을 수 없습니다.";
  if (outcome === "INVALID_DEADLINE") return "제출 마감은 프로그램 수행 기간 안이어야 합니다.";
  if (outcome === "HAS_SUBMISSION_HISTORY") return "제출 이력이 1개 이상 있어 삭제할 수 없습니다.";
  if (outcome === "SUBMISSION_CONFLICT") return "새 마감보다 늦게 제출된 버전이 있어 변경할 수 없습니다.";
  return null;
}

function error(message: string): ProgramReportActionState { return { status: "error", message }; }
function success(message: string): ProgramReportActionState { return { status: "success", message }; }
