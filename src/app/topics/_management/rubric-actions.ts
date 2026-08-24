"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma, type Prisma as PrismaTypes } from "@/generated/prisma/client";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { programManagementHref } from "@/modules/project-program/ui/program-management-route";
import { koreanLocalDateTime } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RubricActionState = { status: "idle" | "error" | "success"; message: string };

const uuid = z.string().uuid();
const rubricInput = z.object({
  title: z.string().trim().min(1).max(100),
  gradingDueAt: koreanLocalDateTime,
  audience: z.enum(["STAFF_ONLY", "TEAM_MEMBERS"]),
});
const criterionInput = z.object({
  label: z.string().trim().min(1).max(60),
  maxPoints: z.coerce.number().int().min(1).max(100),
});

async function requireAdmin() {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  return actor.role === "ADMIN" ? actor : null;
}

function refresh(programId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/topics");
  revalidatePath(programManagementHref(programId, "rubric"));
}

async function lockProgram(tx: PrismaTypes.TransactionClient, programId: string) {
  const rows = await tx.$queryRaw<Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
  }>>(Prisma.sql`
    SELECT "id", "startsAt", "endsAt"
    FROM "project_program" WHERE "id" = ${programId} FOR UPDATE
  `);
  return rows[0] ?? null;
}

function failure(message: string): RubricActionState { return { status: "error", message }; }
function success(message: string): RubricActionState { return { status: "success", message }; }

// 채점표 잠금 판단은 교직원 점수와 자문위원 점수를 모두 봐야 한다. 예전에는 rubricScore 만
// 봤는데, 자문위원만 채점하는 프로그램에서는 그 표가 비어 있어 잠금이 전혀 걸리지 않았다.
// 그 상태로 채점 마감을 과거로 잘못 저장하면 자문위원 화면이 통째로 읽기 전용이 되어
// 위원들이 점수를 고치지도 마저 넣지도 못한다.
async function latestRubricScoreAt(tx: PrismaTypes.TransactionClient, rubricId: string): Promise<Date | null> {
  const [staffScore, advisorScore] = await Promise.all([
    tx.rubricScore.findFirst({ where: { evaluation: { rubricId } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    tx.advisorScore.findFirst({ where: { evaluation: { rubricId } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);
  const stamps = [staffScore?.updatedAt, advisorScore?.updatedAt].filter((value): value is Date => Boolean(value));
  if (!stamps.length) return null;
  return stamps.reduce((latest, value) => (value > latest ? value : latest));
}

async function hasSavedRubricEvaluation(tx: PrismaTypes.TransactionClient, rubricId: string) {
  const [staffScore, advisorEvaluation] = await Promise.all([
    tx.rubricScore.findFirst({ where: { evaluation: { rubricId } }, select: { id: true } }),
    tx.advisorEvaluation.findFirst({ where: { rubricId }, select: { id: true } }),
  ]);
  return Boolean(staffScore || advisorEvaluation);
}

function activeTeamWhere(programId: string, divisionId: string | null): PrismaTypes.ProjectTeamWhereInput {
  if (divisionId) return { project: { programId, status: "ACTIVE", divisionId } };
  return { project: { programId, status: "ACTIVE" } };
}

export async function createRubricAction(
  programId: string,
  _state: RubricActionState,
  formData: FormData,
): Promise<RubricActionState> {
  const actor = await requireAdmin();
  if (!actor) return failure("채점표는 관리자만 관리할 수 있습니다.");
  const parsed = rubricInput.safeParse(Object.fromEntries(formData));
  const divisionValue = formData.get("divisionId");
  const divisionId = typeof divisionValue === "string" && divisionValue ? divisionValue : null;
  const criteriaValue = formData.get("criteriaJson");
  if (typeof criteriaValue !== "string" || !criteriaValue) return failure("평가 항목을 하나 이상 추가해 주세요.");
  let criteria: Array<z.infer<typeof criterionInput>>;
  try {
    const criteriaParsed = z.array(criterionInput).min(1).max(20).safeParse(JSON.parse(criteriaValue));
    if (!criteriaParsed.success) return failure("평가 항목과 배점을 확인해 주세요.");
    criteria = criteriaParsed.data;
  } catch {
    return failure("평가 항목과 배점을 확인해 주세요.");
  }
  if (!uuid.safeParse(programId).success || (divisionId && !uuid.safeParse(divisionId).success) || !parsed.success) return failure("채점표 제목, 마감, 공개 대상을 확인해 주세요.");
  const outcome = await prisma.$transaction(async (tx) => {
    const program = await lockProgram(tx, programId);
    if (!program) return "NOT_FOUND" as const;
    if (parsed.data.gradingDueAt < program.startsAt || parsed.data.gradingDueAt > program.endsAt) return "DEADLINE" as const;
    if (divisionId) {
      const division = await tx.programDivision.findFirst({ where: { id: divisionId, programId }, select: { id: true } });
      if (!division) return "SCOPE" as const;
    }
    const duplicate = await tx.rubricDefinition.findFirst({
      where: { programId, divisionId, archivedAt: null, legacy: false, title: { equals: parsed.data.title, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) return "DUPLICATE" as const;
    const last = await tx.rubricDefinition.findFirst({ where: { programId, divisionId, archivedAt: null, legacy: false }, orderBy: { position: "desc" }, select: { position: true } });
    const rubric = await tx.rubricDefinition.create({
      data: {
        programId,
        divisionId,
        ...parsed.data,
        position: (last?.position ?? -1) + 1,
        criteria: { create: criteria.map((criterion, position) => ({ ...criterion, position })) },
      },
    });
    const teams = await tx.projectTeam.findMany({ where: activeTeamWhere(programId, divisionId), select: { id: true } });
    if (teams.length) await tx.projectTeamRubricEvaluation.createMany({ data: teams.map((team) => ({ projectTeamId: team.id, rubricId: rubric.id })), skipDuplicates: true });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_CREATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId: rubric.id, divisionId, ...parsed.data, gradingDueAt: parsed.data.gradingDueAt.toISOString(), criteria } } });
    return "OK" as const;
  });
  if (outcome === "DEADLINE") return failure("채점 마감은 프로그램 운영 기간 안이어야 합니다.");
  if (outcome === "DUPLICATE") return failure("같은 범위에 동일한 제목의 채점표가 있습니다.");
  if (outcome === "SCOPE") return failure("프로그램에 없는 분과입니다.");
  if (outcome !== "OK") return failure("프로그램을 찾을 수 없습니다.");
  refresh(programId);
  return success("채점표를 추가하고 대상 팀에 할당했습니다.");
}

export async function updateRubricAction(
  rubricId: string,
  programId: string,
  _state: RubricActionState,
  formData: FormData,
): Promise<RubricActionState> {
  const actor = await requireAdmin();
  if (!actor) return failure("채점표는 관리자만 관리할 수 있습니다.");
  const parsed = rubricInput.safeParse(Object.fromEntries(formData));
  if (!uuid.safeParse(rubricId).success || !parsed.success) return failure("채점표 입력을 확인해 주세요.");
  const outcome = await prisma.$transaction(async (tx) => {
    const program = await lockProgram(tx, programId);
    if (!program) return "NOT_FOUND" as const;
    const current = await tx.rubricDefinition.findFirst({ where: { id: rubricId, programId, archivedAt: null, legacy: false }, select: { id: true, divisionId: true, title: true, gradingDueAt: true, audience: true } });
    if (!current) return "NOT_FOUND" as const;
    if (parsed.data.gradingDueAt < program.startsAt || parsed.data.gradingDueAt > program.endsAt) return "DEADLINE" as const;
    const duplicate = await tx.rubricDefinition.findFirst({ where: { programId, divisionId: current.divisionId, archivedAt: null, legacy: false, id: { not: rubricId }, title: { equals: parsed.data.title, mode: "insensitive" } }, select: { id: true } });
    if (duplicate) return "DUPLICATE" as const;
    const latestScoredAt = await latestRubricScoreAt(tx, rubricId);
    if (latestScoredAt && current.title !== parsed.data.title) return "LOCKED" as const;
    if (latestScoredAt && parsed.data.gradingDueAt < latestScoredAt) return "SCORE_CONFLICT" as const;
    await tx.rubricDefinition.update({ where: { id: rubricId }, data: parsed.data });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_UPDATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId, from: { title: current.title, gradingDueAt: current.gradingDueAt.toISOString(), audience: current.audience }, to: { ...parsed.data, gradingDueAt: parsed.data.gradingDueAt.toISOString() } } } });
    return "OK" as const;
  });
  if (outcome === "DEADLINE") return failure("채점 마감은 프로그램 운영 기간 안에서 지정해야 합니다.");
  if (outcome === "DUPLICATE") return failure("같은 범위에 동일한 제목의 채점표가 있습니다.");
  if (outcome === "LOCKED") return failure("점수가 저장되어 채점표 제목은 변경할 수 없습니다.");
  if (outcome === "SCORE_CONFLICT") return failure("새 마감보다 늦게 저장된 점수가 있어 변경할 수 없습니다.");
  if (outcome !== "OK") return failure("채점표를 찾을 수 없습니다.");
  refresh(programId);
  return success("채점표 설정을 변경했습니다.");
}

export async function archiveRubricAction(rubricId: string, programId: string, _state: RubricActionState): Promise<RubricActionState> {
  void _state;
  const actor = await requireAdmin();
  if (!actor) return failure("채점표는 관리자만 관리할 수 있습니다.");
  const outcome = await prisma.$transaction(async (tx) => {
    const program = await lockProgram(tx, programId);
    if (!program) return "NOT_FOUND" as const;
    const rubric = await tx.rubricDefinition.findFirst({ where: { id: rubricId, programId, archivedAt: null, legacy: false }, select: { title: true } });
    if (!rubric) return "NOT_FOUND" as const;
    if (await hasSavedRubricEvaluation(tx, rubricId)) return "SCORED" as const;
    await tx.projectTeamRubricEvaluation.deleteMany({ where: { rubricId } });
    await tx.rubricDefinition.delete({ where: { id: rubricId } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_ARCHIVED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId, title: rubric.title } } });
    return "OK" as const;
  });
  if (outcome === "SCORED") return failure("점수가 저장된 채점표는 삭제하거나 보관할 수 없습니다.");
  if (outcome !== "OK") return failure("채점표를 찾을 수 없습니다.");
  refresh(programId);
  return success("채점표를 삭제했습니다.");
}

async function mutateRubricStructure<T>(programId: string, rubricId: string, operation: (tx: PrismaTypes.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    const program = await lockProgram(tx, programId);
    if (!program) return null;
    const rubric = await tx.rubricDefinition.findFirst({ where: { id: rubricId, programId, archivedAt: null, legacy: false }, select: { id: true } });
    if (!rubric) return null;
    if (await hasSavedRubricEvaluation(tx, rubricId)) return null;
    return operation(tx);
  });
}

export async function createCriterionAction(rubricId: string, programId: string, _state: RubricActionState, formData: FormData): Promise<RubricActionState> {
  const actor = await requireAdmin();
  if (!actor) return failure("채점 항목은 관리자만 관리할 수 있습니다.");
  const parsed = z.object({ label: z.string().trim().min(1).max(60), maxPoints: z.coerce.number().int().min(1).max(100) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure("항목 이름과 배점을 확인해 주세요.");
  const created = await mutateRubricStructure(programId, rubricId, async (tx) => {
    const last = await tx.rubricCriterion.findFirst({ where: { rubricId }, orderBy: { position: "desc" }, select: { position: true } });
    const criterion = await tx.rubricCriterion.create({ data: { rubricId, ...parsed.data, position: (last?.position ?? -1) + 1 } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_UPDATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId, criterion: { action: "CREATED", id: criterion.id, ...parsed.data } } } });
    return true;
  });
  if (!created) return failure("점수가 저장되었거나 프로그램이 종료되어 구조를 변경할 수 없습니다.");
  refresh(programId);
  return success("채점 항목을 추가했습니다.");
}

export async function deleteCriterionAction(criterionId: string, rubricId: string, programId: string, _state: RubricActionState): Promise<RubricActionState> {
  void _state;
  const actor = await requireAdmin();
  if (!actor) return failure("채점 항목은 관리자만 관리할 수 있습니다.");
  const deleted = await mutateRubricStructure(programId, rubricId, async (tx) => {
    const current = await tx.rubricCriterion.findFirst({ where: { id: criterionId, rubricId }, select: { label: true, maxPoints: true } });
    if (!current) return false;
    const result = await tx.rubricCriterion.deleteMany({ where: { id: criterionId, rubricId } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_UPDATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId, criterion: { action: "DELETED", id: criterionId, ...current } } } });
    return result.count === 1;
  });
  if (!deleted) return failure("점수가 저장되었거나 항목이 변경되어 삭제할 수 없습니다.");
  refresh(programId);
  return success("채점 항목을 삭제했습니다.");
}

export async function moveCriterionAction(criterionId: string, rubricId: string, programId: string, direction: "up" | "down", _state: RubricActionState): Promise<RubricActionState> {
  void _state;
  const actor = await requireAdmin();
  if (!actor) return failure("채점 항목은 관리자만 관리할 수 있습니다.");
  const moved = await mutateRubricStructure(programId, rubricId, async (tx) => {
    const current = await tx.rubricCriterion.findFirst({ where: { id: criterionId, rubricId }, select: { id: true, position: true } });
    if (!current) return false;
    const neighbor = await tx.rubricCriterion.findFirst({ where: { rubricId, position: direction === "up" ? { lt: current.position } : { gt: current.position } }, orderBy: { position: direction === "up" ? "desc" : "asc" }, select: { id: true, position: true } });
    if (neighbor) {
      const temporary = Math.max(current.position, neighbor.position) + 1_000_000;
      await tx.rubricCriterion.update({ where: { id: current.id }, data: { position: temporary } });
      await tx.rubricCriterion.update({ where: { id: neighbor.id }, data: { position: current.position } });
      await tx.rubricCriterion.update({ where: { id: current.id }, data: { position: neighbor.position } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_UPDATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId, criterion: { action: "MOVED", id: criterionId, from: current.position, to: neighbor.position } } } });
    }
    return true;
  });
  if (!moved) return failure("점수가 저장되었거나 항목이 변경되어 순서를 바꿀 수 없습니다.");
  refresh(programId);
  return success("");
}

export async function updateCriterionAction(criterionId: string, rubricId: string, programId: string, _state: RubricActionState, formData: FormData): Promise<RubricActionState> {
  const actor = await requireAdmin();
  if (!actor) return failure("채점 항목은 관리자만 관리할 수 있습니다.");
  const parsed = z.object({ label: z.string().trim().min(1).max(60), maxPoints: z.coerce.number().int().min(1).max(100) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure("항목 이름과 배점을 확인해 주세요.");
  const updated = await mutateRubricStructure(programId, rubricId, async (tx) => {
    const current = await tx.rubricCriterion.findFirst({ where: { id: criterionId, rubricId }, select: { label: true, maxPoints: true } });
    if (!current) return false;
    await tx.rubricCriterion.update({ where: { id: criterionId }, data: parsed.data });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_UPDATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId, criterion: { action: "UPDATED", id: criterionId, from: current, to: parsed.data } } } });
    return true;
  });
  if (!updated) return failure("점수가 저장되었거나 항목이 변경되어 수정할 수 없습니다.");
  refresh(programId);
  return success("채점 항목을 변경했습니다.");
}

export async function moveRubricAction(rubricId: string, programId: string, direction: "up" | "down", _state: RubricActionState): Promise<RubricActionState> {
  void _state;
  const actor = await requireAdmin();
  if (!actor) return failure("채점표는 관리자만 관리할 수 있습니다.");
  const moved = await mutateRubricStructure(programId, rubricId, async (tx) => {
    const current = await tx.rubricDefinition.findUnique({ where: { id: rubricId }, select: { divisionId: true, position: true } });
    if (!current) return false;
    const neighbor = await tx.rubricDefinition.findFirst({ where: { programId, divisionId: current.divisionId, archivedAt: null, legacy: false, position: direction === "up" ? { lt: current.position } : { gt: current.position } }, orderBy: { position: direction === "up" ? "desc" : "asc" }, select: { id: true, position: true } });
    if (neighbor) {
      const temporary = Math.max(current.position, neighbor.position) + 1_000_000;
      await tx.rubricDefinition.update({ where: { id: rubricId }, data: { position: temporary } });
      await tx.rubricDefinition.update({ where: { id: neighbor.id }, data: { position: current.position } });
      await tx.rubricDefinition.update({ where: { id: rubricId }, data: { position: neighbor.position } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "PROGRAM_RUBRIC_UPDATED", targetType: "PROJECT_PROGRAM", targetId: programId, metadata: { rubricId, position: { from: current.position, to: neighbor.position } } } });
    }
    return true;
  });
  if (!moved) return failure("점수가 저장되었거나 채점표가 변경되어 순서를 바꿀 수 없습니다.");
  refresh(programId);
  return success("");
}
