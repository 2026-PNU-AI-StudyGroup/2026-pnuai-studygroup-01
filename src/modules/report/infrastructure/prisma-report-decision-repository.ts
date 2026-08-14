import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createReportActivityNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { ReportDecisionWriter } from "@/modules/report/application/report-ports";
import type {
  ApprovalDecision,
} from "@/modules/report/domain/report-policy";
import { teamSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export class PrismaReportDecisionRepository implements ReportDecisionWriter {
  constructor(private readonly client: PrismaClient) {}

  decide(input: {
    reportVersionId: string;
    actor: CurrentActor;
    decision: ApprovalDecision;
    comment: string;
    decidedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${input.reportVersionId}, 2))
      `);
      const teams = await transaction.$queryRaw<Array<{
        id: string;
        name: string;
        projectId: string;
      }>>(Prisma.sql`
        SELECT "project_team"."id", "project_team"."name", "project_team"."projectId"
        FROM "report_version"
        JOIN "report" ON "report"."id" = "report_version"."reportId"
        JOIN "project_team" ON "project_team"."id" = "report"."projectTeamId"
        JOIN "topic" ON "topic"."id" = "project_team"."projectId"
        JOIN "project_program" ON "project_program"."id" = "topic"."programId"
        WHERE "report_version"."id" = ${input.reportVersionId}
          AND "topic"."status" = 'ACTIVE'
          AND "project_team"."confirmedAt" IS NOT NULL
          AND (${input.actor.role}::"UserRole" = 'ADMIN' OR "project_program"."endsAt" > ${input.decidedAt})
          AND ${teamSupervisorSql(input.actor)}
        FOR UPDATE OF "project_team"
      `);
      if (teams.length !== 1) return false;
      const authorized = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "report_version"."id"
        FROM "report_version"
        WHERE "report_version"."id" = ${input.reportVersionId}
          AND "report_version"."version" = (
            SELECT max("latest"."version")
            FROM "report_version" AS "latest"
            WHERE "latest"."reportId" = "report_version"."reportId"
          )
          AND NOT EXISTS (
            SELECT 1 FROM "approval_decision"
            WHERE "reportVersionId" = "report_version"."id"
          )
        FOR UPDATE
      `);
      if (authorized.length !== 1) return false;
      await transaction.approvalDecision.create({
        data: {
          id: randomUUID(),
          reportVersionId: input.reportVersionId,
          reviewerId: input.actor.id,
          decision: input.decision,
          comment: input.comment,
          decidedAt: input.decidedAt,
        },
      });
      const reportVersion = await transaction.reportVersion.findUnique({
        where: { id: input.reportVersionId },
        select: { version: true, report: { select: { titleSnapshot: true } } },
      });
      const members = await transaction.projectTeamMembership.findMany({
        where: { projectTeamId: teams[0].id, endedAt: null },
        select: { userId: true },
      });
      if (reportVersion) {
        const approved = input.decision === "APPROVED";
        await createReportActivityNotifications(
          transaction,
          members.map(({ userId }) => ({
            dedupeKey: `report-decision:${input.reportVersionId}:${input.decision}:${userId}`,
            recipientId: userId,
            title: approved
              ? `${reportVersion.report.titleSnapshot}가 승인되었습니다`
              : `${reportVersion.report.titleSnapshot}에 수정 요청이 있습니다`,
            body: approved
              ? `${teams[0].name}의 버전 ${reportVersion.version} 보고서가 승인되었습니다.`
              : input.comment,
            titleEn: approved ? "Report approved" : "Report revision requested",
            bodyEn: approved
              ? `Version ${reportVersion.version} of the ${teams[0].name} report was approved.`
              : "A revision was requested for the report. Open PMS to read the review comment.",
            href: `/projects/${teams[0].projectId}/reports`,
            createdAt: input.decidedAt,
          })),
        );
      }
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: input.decision === "APPROVED"
          ? "REPORT_APPROVED"
          : "REPORT_REVISION_REQUESTED",
        targetType: "REPORT_VERSION",
        targetId: input.reportVersionId,
        metadata: { teamId: teams[0].id, decision: input.decision },
        createdAt: input.decidedAt,
      } });
      return true;
    });
  }
}
