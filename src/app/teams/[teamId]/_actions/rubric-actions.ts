"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RubricScoreState = { status: "idle" | "error" | "success"; message: string };
export const rubricScoreInitialState: RubricScoreState = { status: "idle", message: "" };

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
      SELECT "team"."programId" AS "id"
      FROM "team_rubric_evaluation" AS evaluation
      JOIN "team" ON "team"."id" = evaluation."teamId"
      WHERE evaluation."id" = ${evaluationId} AND "team"."id" = ${teamId}
    `);
    if (programs.length !== 1) return "NOT_FOUND" as const;
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "project_program" WHERE "id" = ${programs[0].id} FOR UPDATE`);
    const evaluations = await tx.$queryRaw<Array<{ id: string; rubricId: string }>>(Prisma.sql`
      SELECT evaluation."id", evaluation."rubricId"
      FROM "team_rubric_evaluation" AS evaluation
      JOIN "rubric_definition" AS rubric ON rubric."id" = evaluation."rubricId"
      JOIN "team" ON "team"."id" = evaluation."teamId"
      JOIN "topic" ON "topic"."id" = "team"."topicId"
      LEFT JOIN "program_track" AS division ON division."id" = "topic"."trackId"
      WHERE evaluation."id" = ${evaluationId}
        AND "team"."id" = ${teamId}
        AND "team"."status" <> 'FORMING'
        AND rubric."programId" = "team"."programId"
        AND (
          ("topic"."trackId" IS NULL AND rubric."divisionId" IS NULL)
          OR (division."rubricMode" = 'INHERIT_COMMON' AND rubric."divisionId" IS NULL)
          OR (division."rubricMode" = 'CUSTOM' AND rubric."divisionId" = division."id")
        )
        AND rubric."legacy" = false
        AND rubric."archivedAt" IS NULL
        AND ${now} <= rubric."gradingDueAt"
        AND (
          ${actor.role}::"UserRole" = 'ADMIN'
          OR "team"."professorId" = ${actor.id}
          OR EXISTS (
            SELECT 1 FROM "project_assistant"
            WHERE "project_assistant"."topicId" = "team"."topicId"
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
      const parsed = z.coerce.number().int().min(0).max(criterion.maxPoints).safeParse(formData.get(`points_${criterion.id}`));
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
  revalidatePath(`/teams/${teamId}/evaluations`);
  return { status: "success", message: "채점을 저장했습니다." };
}
