import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ReportRequirementWriter } from "@/modules/report/application/report-ports";
import type { ReportType } from "@/modules/report/domain/report-policy";

export class PrismaReportRequirementRepository
  implements ReportRequirementWriter
{
  constructor(private readonly client: PrismaClient) {}

  setRequirement(input: {
    teamId: string;
    actor: CurrentActor;
    type: ReportType;
    dueAt: Date;
    configuredAt: Date;
  }): Promise<{ id: string } | null> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{
        id: string;
        executionStartsAt: Date;
        submissionEndsAt: Date;
      }>>(Prisma.sql`
        SELECT "team"."id", "topic"."executionStartsAt", "topic"."submissionEndsAt"
        FROM "team"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR (${input.actor.role}::"UserRole" = 'PROFESSOR' AND "team"."professorId" = ${input.actor.id})
          )
        FOR UPDATE OF "team"
      `);
      const team = teams[0];
      if (
        !team ||
        input.dueAt < team.executionStartsAt ||
        input.dueAt > team.submissionEndsAt
      ) return null;

      const report = await transaction.report.upsert({
        where: { teamId_type: { teamId: input.teamId, type: input.type } },
        create: { teamId: input.teamId, type: input.type, dueAt: input.dueAt },
        update: { dueAt: input.dueAt },
        select: { id: true },
      });
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: "REPORT_REQUIREMENT_SET",
        targetType: "REPORT",
        targetId: report.id,
        metadata: {
          teamId: input.teamId,
          reportType: input.type,
          dueAt: input.dueAt.toISOString(),
        },
        createdAt: input.configuredAt,
      } });
      return report;
    });
  }

  removeRequirement(input: {
    teamId: string;
    actor: CurrentActor;
    type: ReportType;
    removedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "team"."id"
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR (${input.actor.role}::"UserRole" = 'PROFESSOR' AND "team"."professorId" = ${input.actor.id})
          )
        FOR UPDATE OF "team"
      `);
      if (teams.length !== 1) return false;
      const report = await transaction.report.findUnique({
        where: { teamId_type: { teamId: input.teamId, type: input.type } },
        select: { id: true, _count: { select: { versions: true } } },
      });
      if (!report || report._count.versions > 0) return false;
      await transaction.report.delete({ where: { id: report.id } });
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: "REPORT_REQUIREMENT_REMOVED",
        targetType: "REPORT",
        targetId: report.id,
        metadata: { teamId: input.teamId, reportType: input.type },
        createdAt: input.removedAt,
      } });
      return true;
    });
  }
}
