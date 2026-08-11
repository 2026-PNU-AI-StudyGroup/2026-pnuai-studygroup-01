"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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

  const count = await prisma.rubricCriterion.count({ where: { programId } });
  await prisma.rubricCriterion.create({
    data: { programId, label, maxPoints: parsedPoints.data, position: count },
  });
  revalidatePath(`/admin/programs/${programId}`);
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
  await prisma.rubricCriterion.delete({ where: { id: criterionId } });
  revalidatePath(`/admin/programs/${criterion.programId}`);
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
  const neighbor = await prisma.rubricCriterion.findFirst({
    where: {
      programId: criterion.programId,
      position: direction === "up" ? { lt: criterion.position } : { gt: criterion.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
    select: { id: true, position: true },
  });
  if (neighbor) {
    await prisma.$transaction([
      prisma.rubricCriterion.update({ where: { id: criterionId }, data: { position: neighbor.position } }),
      prisma.rubricCriterion.update({ where: { id: neighbor.id }, data: { position: criterion.position } }),
    ]);
  }
  revalidatePath(`/admin/programs/${criterion.programId}`);
  return { status: "success", message: "" };
}
