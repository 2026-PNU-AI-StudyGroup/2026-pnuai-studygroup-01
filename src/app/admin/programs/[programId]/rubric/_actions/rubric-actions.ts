"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type Prisma } from "@/generated/prisma/client";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RubricActionState = { status: "idle" | "error" | "success"; message: string };
export const rubricInitialState: RubricActionState = { status: "idle", message: "" };

const idSchema = z.string().uuid();
const maxPointsSchema = z.coerce.number().int().min(1).max(100);

async function requireAdmin() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") return null;
  return actor;
}

async function mutateUnlockedRubric<T>(programId: string, operation: (transaction: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (transaction) => {
    const programs = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "project_program" WHERE "id" = ${programId} FOR UPDATE
    `;
    if (!programs[0]) return null;
    const score = await transaction.reportRubricScore.findFirst({
      where: { criterion: { programId } },
      select: { id: true },
    });
    if (score) return null;
    return operation(transaction);
  });
}

export async function createCriterionAction(
  programId: string,
  _previous: RubricActionState,
  formData: FormData,
): Promise<RubricActionState> {
  if (!(await requireAdmin())) return { status: "error", message: "채점 항목은 관리자만 관리할 수 있습니다." };
  if (!idSchema.safeParse(programId).success) return { status: "error", message: "프로그램을 찾을 수 없습니다." };
  const label = String(formData.get("label") ?? "").trim();
  const parsedPoints = maxPointsSchema.safeParse(formData.get("maxPoints"));
  if (!label || label.length > 60) return { status: "error", message: "항목 이름은 1자 이상 60자 이내로 입력해 주세요." };
  if (!parsedPoints.success) return { status: "error", message: "배점은 1점 이상 100점 이내로 입력해 주세요." };
  const created = await mutateUnlockedRubric(programId, async (transaction) => {
    const count = await transaction.rubricCriterion.count({ where: { programId } });
    await transaction.rubricCriterion.create({
      data: { programId, label, maxPoints: parsedPoints.data, position: count },
    });
    return true;
  });
  if (!created) return { status: "error", message: "이미 채점된 보고서가 있거나 프로그램을 찾을 수 없어 채점표 구조를 바꿀 수 없습니다." };
  revalidatePath(`/admin/programs/${programId}/rubric`);
  return { status: "success", message: "채점 항목을 추가했습니다." };
}

export async function deleteCriterionAction(
  criterionId: string,
  _previous: RubricActionState,
  _formData: FormData,
): Promise<RubricActionState> {
  void _formData;
  if (!(await requireAdmin())) return { status: "error", message: "채점 항목은 관리자만 관리할 수 있습니다." };
  const criterion = await prisma.rubricCriterion.findUnique({ where: { id: criterionId }, select: { programId: true } });
  if (!criterion) return { status: "error", message: "채점 항목을 찾을 수 없습니다." };
  const deleted = await mutateUnlockedRubric(criterion.programId, async (transaction) => {
    const current = await transaction.rubricCriterion.findUnique({ where: { id: criterionId }, select: { programId: true } });
    if (!current || current.programId !== criterion.programId) return false;
    await transaction.rubricCriterion.delete({ where: { id: criterionId } });
    return true;
  });
  if (!deleted) return { status: "error", message: "이미 채점된 보고서가 있거나 채점 항목이 변경되어 삭제할 수 없습니다." };
  revalidatePath(`/admin/programs/${criterion.programId}/rubric`);
  return { status: "success", message: "채점 항목을 삭제했습니다." };
}

export async function moveCriterionAction(
  criterionId: string,
  direction: "up" | "down",
  _previous: RubricActionState,
  _formData: FormData,
): Promise<RubricActionState> {
  void _formData;
  if (!(await requireAdmin())) return { status: "error", message: "채점 항목은 관리자만 관리할 수 있습니다." };
  const criterion = await prisma.rubricCriterion.findUnique({ where: { id: criterionId }, select: { programId: true, position: true } });
  if (!criterion) return { status: "error", message: "채점 항목을 찾을 수 없습니다." };
  const moved = await mutateUnlockedRubric(criterion.programId, async (transaction) => {
    const current = await transaction.rubricCriterion.findUnique({ where: { id: criterionId }, select: { programId: true, position: true } });
    if (!current || current.programId !== criterion.programId) return false;
    const neighbor = await transaction.rubricCriterion.findFirst({
      where: { programId: current.programId, position: direction === "up" ? { lt: current.position } : { gt: current.position } },
      orderBy: { position: direction === "up" ? "desc" : "asc" },
      select: { id: true, position: true },
    });
    if (neighbor) {
      await transaction.rubricCriterion.update({ where: { id: criterionId }, data: { position: neighbor.position } });
      await transaction.rubricCriterion.update({ where: { id: neighbor.id }, data: { position: current.position } });
    }
    return true;
  });
  if (!moved) return { status: "error", message: "이미 채점된 보고서가 있거나 채점 항목이 변경되어 순서를 바꿀 수 없습니다." };
  revalidatePath(`/admin/programs/${criterion.programId}/rubric`);
  return { status: "success", message: "" };
}
