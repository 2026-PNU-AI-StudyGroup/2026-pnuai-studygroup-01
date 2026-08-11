"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ReportOperationNotAllowedError,
  ReportRequirementService,
} from "@/modules/report/application/manage-reports";
import { PrismaReportRequirementRepository } from "@/modules/report/infrastructure/prisma-report-requirement-repository";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { koreanLocalDateTime } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProgramReportActionState = { status: "idle" | "error" | "success"; message: string };

const REPORT_TYPES = ["START", "MIDTERM", "FINAL"] as const;

// 프로그램의 현재 모든 팀에 보고서(제출물) 요건을 일괄 지정/해제한다.
export async function applyProgramReportRequirementsAction(
  _state: ProgramReportActionState,
  formData: FormData,
): Promise<ProgramReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") return { status: "error", message: "관리자만 프로그램 제출물 요건을 설정할 수 있습니다." };
  const programId = z.string().uuid().safeParse(formData.get("programId"));
  if (!programId.success) return { status: "error", message: "프로그램을 확인해 주세요." };

  const plan: Array<{ type: (typeof REPORT_TYPES)[number]; dueAt: Date | null }> = [];
  for (const type of REPORT_TYPES) {
    if (formData.get(`enabled_${type}`) !== "true") { plan.push({ type, dueAt: null }); continue; }
    const due = koreanLocalDateTime.safeParse(formData.get(`due_${type}`));
    if (!due.success) return { status: "error", message: "요구한 보고서의 마감 일시를 확인해 주세요." };
    plan.push({ type, dueAt: due.data });
  }
  if (plan.every((entry) => entry.dueAt === null)) {
    return { status: "error", message: "적용할 제출물을 하나 이상 선택해 주세요." };
  }

  const teams = await prisma.team.findMany({ where: { programId: programId.data, status: { not: "CLOSED" } }, select: { id: true } });
  if (teams.length === 0) return { status: "error", message: "적용할 팀이 없습니다. 팀이 확정된 뒤 다시 시도해 주세요." };

  const service = new ReportRequirementService(new PrismaReportRequirementRepository(prisma));
  let applied = 0;
  let skipped = 0;
  for (const team of teams) {
    for (const entry of plan) {
      if (entry.dueAt) {
        try { await service.setRequirement(actor, { teamId: team.id, type: entry.type, dueAt: entry.dueAt }); applied++; }
        catch (error) { if (error instanceof ReportOperationNotAllowedError) { skipped++; continue; } throw error; }
      } else {
        // 해제는 제출 이력이 없을 때만 가능 — 대상이 없으면 조용히 넘어간다.
        try { await service.removeRequirement(actor, { teamId: team.id, type: entry.type }); }
        catch (error) { if (!(error instanceof ReportOperationNotAllowedError)) throw error; }
      }
    }
  }
  revalidatePath(`/admin/programs/${programId.data}`);
  for (const team of teams) revalidatePath(`/teams/${team.id}`, "layout");
  return { status: "success", message: `팀 ${teams.length}개 대상 · 요구 ${applied}건 저장 · 건너뜀 ${skipped}건(기간 밖·제출 이력 등).` };
}
