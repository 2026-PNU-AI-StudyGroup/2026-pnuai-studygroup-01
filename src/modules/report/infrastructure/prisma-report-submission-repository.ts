import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createReportActivityNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { ReportSubmissionWriter } from "@/modules/report/application/report-ports";

export class PrismaReportSubmissionRepository
  implements ReportSubmissionWriter
{
  constructor(private readonly client: PrismaClient) {}

  submit(input: {
    teamId: string;
    reportId: string;
    actor: CurrentActor;
    fileId: string;
    description: string;
    submittedAt: Date;
  }): Promise<{ reportId: string; version: number } | null> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program"
        JOIN "team" ON "team"."programId" = "project_program"."id"
        JOIN "report" ON "report"."teamId" = "team"."id"
        WHERE "team"."id" = ${input.teamId}
          AND "report"."id" = ${input.reportId}
        FOR UPDATE OF "project_program"
      `);
      if (programs.length !== 1) return null;
      const authorized = await transaction.$queryRaw<Array<{
        id: string;
        professorId: string;
        topicId: string;
        name: string;
      }>>(Prisma.sql`
        SELECT "team"."id", "team"."professorId", "team"."topicId", "team"."name"
        FROM "team"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        JOIN "project_program" ON "project_program"."id" = "team"."programId"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" = 'CONFIRMED'
          AND "project_program"."lifecycleStatus" = 'ACTIVE'
          AND ${input.submittedAt} >= "project_program"."submissionStartsAt"
          AND ${input.submittedAt} <= "project_program"."submissionEndsAt"
          AND ${input.submittedAt} <= "project_program"."endsAt"
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR EXISTS (
              SELECT 1 FROM "team_member"
              WHERE "teamId" = "team"."id" AND "studentId" = ${input.actor.id}
            )
          )
        FOR UPDATE OF "team"
      `);
      if (authorized.length !== 1) return null;
      const requirements = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "report"."id" FROM "report"
        JOIN "program_report_definition" ON "program_report_definition"."id" = "report"."definitionId"
        WHERE "report"."id" = ${input.reportId}
          AND "report"."teamId" = ${input.teamId}
          AND "report"."required" = true
          AND "program_report_definition"."archivedAt" IS NULL
          AND ${input.submittedAt} <= "report"."dueAt"
        FOR UPDATE OF "report"
      `);
      const report = requirements[0];
      if (!report) return null;
      const files = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "stored_file"
        WHERE "id" = ${input.fileId}
          AND "teamId" = ${input.teamId}
          AND "ownerId" = ${input.actor.id}
          AND "purpose" = 'REPORT'
          AND "status" = 'READY'
        FOR UPDATE
      `);
      if (files.length !== 1) return null;

      const latest = await transaction.reportVersion.aggregate({
        where: { reportId: report.id },
        _max: { version: true },
      });
      const version = (latest._max.version ?? 0) + 1;
      const reportVersionId = randomUUID();
      await transaction.reportVersion.create({
        data: {
          id: reportVersionId,
          reportId: report.id,
          version,
          fileId: input.fileId,
          submitterId: input.actor.id,
          description: input.description,
          submittedAt: input.submittedAt,
        },
      });
      const assistants = await transaction.projectAssistant.findMany({
        where: { topicId: authorized[0].topicId },
        select: { userId: true },
      });
      const supervisorIds = [...new Set([
        authorized[0].professorId,
        ...assistants.map(({ userId }) => userId),
      ])];
      const reportSnapshot = await transaction.report.findUniqueOrThrow({
        where: { id: report.id },
        select: { titleSnapshot: true },
      });
      await createReportActivityNotifications(
        transaction,
        supervisorIds.map((recipientId) => ({
          dedupeKey: `report-submitted:${reportVersionId}:${recipientId}`,
          recipientId,
          title: `${authorized[0].name} 보고서가 제출되었습니다`,
          body: `${reportSnapshot.titleSnapshot} 버전 ${version}이 제출되었습니다. 최신 파일과 설명을 검토해 주세요.`,
          href: `/teams/${input.teamId}/reports`,
          createdAt: input.submittedAt,
        })),
      );
      return { reportId: report.id, version };
    });
  }
}
