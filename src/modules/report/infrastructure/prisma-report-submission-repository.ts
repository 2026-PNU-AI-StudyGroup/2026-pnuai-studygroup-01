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
        JOIN "topic" ON "topic"."programId" = "project_program"."id"
        JOIN "project_team" ON "project_team"."projectId" = "topic"."id"
        JOIN "report" ON "report"."projectTeamId" = "project_team"."id"
        WHERE "project_team"."id" = ${input.teamId}
          AND "report"."id" = ${input.reportId}
          AND "topic"."status" = 'ACTIVE'
          AND ${input.submittedAt} < "project_program"."endsAt"
        FOR UPDATE OF "project_program"
      `);
      if (programs.length !== 1) return null;
      const authorized = await transaction.$queryRaw<Array<{
        id: string;
        managerId: string | null;
        projectId: string;
        name: string;
      }>>(Prisma.sql`
        SELECT "project_team"."id", "topic"."managerId", "project_team"."projectId", "project_team"."name"
        FROM "project_team"
        JOIN "topic" ON "topic"."id" = "project_team"."projectId"
        JOIN "project_program" ON "project_program"."id" = "topic"."programId"
        WHERE "project_team"."id" = ${input.teamId}
          AND "topic"."status" = 'ACTIVE'
          AND "project_team"."confirmedAt" IS NOT NULL
          AND ${input.submittedAt} < "project_program"."endsAt"
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR (
              ${input.submittedAt} >= "project_program"."submissionStartsAt"
              AND ${input.submittedAt} <= "project_program"."submissionEndsAt"
              AND EXISTS (
                SELECT 1 FROM "project_team_membership"
                WHERE "projectTeamId" = "project_team"."id"
                  AND "userId" = ${input.actor.id}
                  AND "endedAt" IS NULL
              )
            )
          )
        FOR UPDATE OF "project_team"
      `);
      if (authorized.length !== 1) return null;
      const requirements = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "report"."id" FROM "report"
        JOIN "program_report_definition" ON "program_report_definition"."id" = "report"."definitionId"
        WHERE "report"."id" = ${input.reportId}
          AND "report"."projectTeamId" = ${input.teamId}
          AND "report"."required" = true
          AND "program_report_definition"."archivedAt" IS NULL
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR ${input.submittedAt} <= "report"."dueAt"
          )
        FOR UPDATE OF "report"
      `);
      const report = requirements[0];
      if (!report) return null;
      const files = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "stored_file"
        WHERE "id" = ${input.fileId}
          AND "projectTeamId" = ${input.teamId}
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
        where: { topicId: authorized[0].projectId },
        select: { userId: true },
      });
      const supervisorIds = [...new Set([
        ...(authorized[0].managerId ? [authorized[0].managerId] : []),
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
          titleEn: "Report submitted",
          bodyEn: `Version ${version} of ${reportSnapshot.titleSnapshot} was submitted. Review the latest file and description in PMS.`,
          href: `/projects/${authorized[0].projectId}/reports`,
          createdAt: input.submittedAt,
        })),
      );
      return { reportId: report.id, version };
    });
  }
}
