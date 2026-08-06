import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createReportActivityNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { ReportSubmissionWriter } from "@/modules/report/application/report-ports";
import type { ReportType } from "@/modules/report/domain/report-policy";

export class PrismaReportSubmissionRepository
  implements ReportSubmissionWriter
{
  constructor(private readonly client: PrismaClient) {}

  submit(input: {
    teamId: string;
    actor: CurrentActor;
    type: ReportType;
    fileId: string;
    description: string;
    submittedAt: Date;
  }): Promise<{ reportId: string; version: number } | null> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await transaction.$queryRaw<Array<{
        id: string;
        professorId: string;
        topicId: string;
        name: string;
      }>>(Prisma.sql`
        SELECT "team"."id", "team"."professorId", "team"."topicId", "team"."name"
        FROM "team"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" = 'CONFIRMED'
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
        SELECT "id" FROM "report"
        WHERE "teamId" = ${input.teamId}
          AND "type" = ${input.type}::"ReportType"
          AND ${input.submittedAt} <= "dueAt"
        FOR UPDATE
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
      await createReportActivityNotifications(
        transaction,
        supervisorIds.map((recipientId) => ({
          dedupeKey: `report-submitted:${reportVersionId}:${recipientId}`,
          recipientId,
          title: `${authorized[0].name} 보고서가 제출되었습니다`,
          body: `${reportTypeLabel(input.type)} 버전 ${version}이 제출되었습니다. 최신 파일과 설명을 검토해 주세요.`,
          href: `/teams/${input.teamId}/reports`,
          createdAt: input.submittedAt,
        })),
      );
      return { reportId: report.id, version };
    });
  }
}

function reportTypeLabel(type: ReportType) {
  return type === "START" ? "착수 보고서" : type === "MIDTERM" ? "중간 보고서" : "결과 보고서";
}
