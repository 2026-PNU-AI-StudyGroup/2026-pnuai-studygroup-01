import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { teamSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import type { ReportScoreWriter } from "@/modules/report/application/report-ports";

export class PrismaReportScoreRepository implements ReportScoreWriter {
  constructor(private readonly client: PrismaClient) {}

  score(input: {
    reportId: string;
    actor: CurrentActor;
    score: number;
    comment: string;
    scoredAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      // 점수는 해당 팀의 지도교수/조교/관리자만 매길 수 있다(확정·종료 프로젝트).
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "report"."id"
        FROM "report"
        JOIN "team" ON "team"."id" = "report"."teamId"
        WHERE "report"."id" = ${input.reportId}
          AND "team"."status" IN ('CONFIRMED', 'CLOSED')
          AND ${teamSupervisorSql(input.actor)}
        FOR UPDATE OF "report"
      `);
      if (rows.length !== 1) return false;
      await transaction.report.update({
        where: { id: input.reportId },
        data: {
          score: input.score,
          scoreComment: input.comment.length ? input.comment : null,
          scoredById: input.actor.id,
          scoredAt: input.scoredAt,
        },
      });
      return true;
    });
  }
}
