"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RubricScoreState = { status: "idle" | "error" | "success"; message: string };

export async function saveRubricScoresAction(
  evaluationId: string,
  teamId: string,
  _previous: RubricScoreState,
  formData: FormData,
): Promise<RubricScoreState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  if (!z.string().uuid().safeParse(evaluationId).success || !z.string().uuid().safeParse(teamId).success) return { status: "error", message: "평가를 찾을 수 없습니다." };
  const now = new Date();
  const outcome = await prisma.$transaction(async (tx) => {
    const programs = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "topic"."programId" AS "id"
      FROM "project_team_rubric_evaluation" AS evaluation
      JOIN "project_team" ON "project_team"."id" = evaluation."projectTeamId"
      JOIN "topic" ON "topic"."id" = "project_team"."projectId"
      WHERE evaluation."id" = ${evaluationId} AND "project_team"."id" = ${teamId}
    `);
    if (programs.length !== 1) return "NOT_FOUND" as const;
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "project_program" WHERE "id" = ${programs[0].id} FOR UPDATE`);
    const evaluations = await tx.$queryRaw<Array<{ id: string; rubricId: string }>>(Prisma.sql`
      SELECT evaluation."id", evaluation."rubricId"
      FROM "project_team_rubric_evaluation" AS evaluation
      JOIN "rubric_definition" AS rubric ON rubric."id" = evaluation."rubricId"
      JOIN "project_team" ON "project_team"."id" = evaluation."projectTeamId"
      JOIN "topic" ON "topic"."id" = "project_team"."projectId"
      WHERE evaluation."id" = ${evaluationId}
        AND "project_team"."id" = ${teamId}
        AND "project_team"."confirmedAt" IS NOT NULL
        AND "topic"."status" = 'ACTIVE'
        AND rubric."programId" = "topic"."programId"
        AND (rubric."divisionId" IS NULL OR rubric."divisionId" = "topic"."trackId")
        AND rubric."legacy" = false
        AND rubric."archivedAt" IS NULL
        AND ${now} <= rubric."gradingDueAt"
        AND (
          ${actor.role}::"UserRole" = 'ADMIN'
          OR "topic"."managerId" = ${actor.id}
          OR EXISTS (
            SELECT 1 FROM "project_assistant"
            WHERE "project_assistant"."topicId" = "topic"."id"
              AND "project_assistant"."userId" = ${actor.id}
          )
        )
      FOR UPDATE OF evaluation
    `);
    const evaluation = evaluations[0];
    if (!evaluation) return "DENIED" as const;
    const criteria = await tx.rubricCriterion.findMany({ where: { rubricId: evaluation.rubricId }, orderBy: { position: "asc" }, select: { id: true, maxPoints: true } });
    if (!criteria.length) return "MISSING" as const;
    const scores: Array<{ criterionId: string; points: number }> = [];
    for (const criterion of criteria) {
      // formData.get 은 항목이 없으면 null 을 준다. coerce 는 그 null 을 0 으로 바꿔 통과시키므로
      // 채점하지 않은 항목이 0점으로 저장되고 "채점 완료" 로 집계된다. 빈 값은 먼저 거른다.
      const raw = formData.get(`points_${criterion.id}`);
      if (typeof raw !== "string" || raw.trim() === "") return "INVALID" as const;
      const parsed = z.coerce.number().int().min(0).max(criterion.maxPoints).safeParse(raw);
      if (!parsed.success) return "INVALID" as const;
      scores.push({ criterionId: criterion.id, points: parsed.data });
    }
    for (const score of scores) {
      await tx.rubricScore.upsert({
        where: { evaluationId_criterionId: { evaluationId, criterionId: score.criterionId } },
        create: { evaluationId, criterionId: score.criterionId, points: score.points, scoredByName: actor.name },
        update: { points: score.points, scoredByName: actor.name },
      });
    }
    return "SAVED" as const;
  });
  if (outcome === "MISSING") return { status: "error", message: "채점 항목이 없습니다." };
  if (outcome === "INVALID") return { status: "error", message: "모든 점수를 항목별 배점 범위 안에서 입력해 주세요." };
  if (outcome !== "SAVED") return { status: "error", message: "채점 권한 또는 채점 마감을 확인해 주세요." };
  revalidatePath("/projects", "layout");
  return { status: "success", message: "채점을 저장했습니다." };
}
