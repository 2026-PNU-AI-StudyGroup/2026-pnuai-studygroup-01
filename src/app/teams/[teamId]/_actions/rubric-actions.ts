"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { CurrentActor, CurrentUser } from "@/modules/identity/domain/current-actor";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { teamSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RubricScoreState = { status: "idle" | "error" | "success"; message: string };
export const rubricScoreInitialState: RubricScoreState = { status: "idle", message: "" };

const idSchema = z.string().uuid();

async function requireActor(): Promise<CurrentUser> {
  const current = await getCurrentActor();
  if (!current) redirect("/sign-in");
  return current;
}

// 채점 권한: 해당 팀의 지도교수·조교·관리자.
function findScorableReport(reportId: string, actor: CurrentActor) {
  return prisma.report.findFirst({
    where: { id: reportId, team: actor.role === "ADMIN" ? {} : teamSupervisorWhere(actor) },
    select: { id: true, team: { select: { programId: true } } },
  });
}

export async function saveRubricScoresAction(
  reportId: string,
  teamId: string,
  _previous: RubricScoreState,
  formData: FormData,
): Promise<RubricScoreState> {
  const actor = await requireActor();
  if (!idSchema.safeParse(reportId).success) return { status: "error", message: "보고서를 찾을 수 없습니다." };
  const report = await findScorableReport(reportId, actor);
  if (!report) return { status: "error", message: "채점 권한이 없습니다." };

  const criteria = await prisma.rubricCriterion.findMany({
    where: { programId: report.team.programId },
    select: { id: true, maxPoints: true },
  });
  if (criteria.length === 0) return { status: "error", message: "먼저 채점표를 등록해 주세요." };

  const updates: { criterionId: string; points: number }[] = [];
  for (const criterion of criteria) {
    const parsed = z.coerce.number().int().min(0).max(criterion.maxPoints).safeParse(formData.get(`points_${criterion.id}`));
    if (!parsed.success) return { status: "error", message: "입력한 점수를 배점 범위 안에서 확인해 주세요." };
    updates.push({ criterionId: criterion.id, points: parsed.data });
  }

  await prisma.$transaction(updates.map((update) => prisma.reportRubricScore.upsert({
    where: { reportId_criterionId: { reportId, criterionId: update.criterionId } },
    create: { reportId, criterionId: update.criterionId, points: update.points, scoredByName: actor.name },
    update: { points: update.points, scoredByName: actor.name },
  })));
  revalidatePath(`/teams/${teamId}/reports`);
  return { status: "success", message: "채점을 저장했습니다." };
}

export async function toggleRubricReleaseAction(
  reportId: string,
  teamId: string,
  release: boolean,
  _previous: RubricScoreState,
  _formData: FormData,
): Promise<RubricScoreState> {
  void _formData;
  const actor = await requireActor();
  if (actor.role !== "ADMIN") return { status: "error", message: "점수 공개는 관리자만 할 수 있습니다." };
  if (!idSchema.safeParse(reportId).success) return { status: "error", message: "보고서를 찾을 수 없습니다." };
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } });
  if (!report) return { status: "error", message: "보고서를 찾을 수 없습니다." };

  if (release) {
    await prisma.reportRubricRelease.upsert({
      where: { reportId },
      create: { reportId, releasedByName: actor.name },
      update: { releasedAt: new Date(), releasedByName: actor.name },
    });
  } else {
    await prisma.reportRubricRelease.deleteMany({ where: { reportId } });
  }
  revalidatePath(`/teams/${teamId}/reports`);
  return { status: "success", message: release ? "점수를 학생에게 공개했습니다." : "점수 공개를 해제했습니다." };
}
