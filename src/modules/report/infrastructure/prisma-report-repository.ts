import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createReportActivityNotifications } from "@/modules/notification/infrastructure/notification-events";
import type {
  ReportRepository,
  ReportWorkspace,
} from "@/modules/report/application/report-ports";
import type {
  ApprovalDecision,
  ArtifactType,
  ReportType,
} from "@/modules/report/domain/report-policy";
import { PrismaReportQueryRepository } from "@/modules/report/infrastructure/prisma-report-query-repository";

export class PrismaReportRepository implements ReportRepository {
  private readonly queryRepository: PrismaReportQueryRepository;

  constructor(private readonly client: PrismaClient) {
    this.queryRepository = new PrismaReportQueryRepository(client);
  }

  findWorkspace(
    teamId: string,
    actor: CurrentActor,
  ): Promise<ReportWorkspace | null> {
    return this.queryRepository.findWorkspace(teamId, actor);
  }

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
        metadata: { teamId: input.teamId, reportType: input.type, dueAt: input.dueAt.toISOString() },
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

  submit(input: {
    teamId: string;
    actor: CurrentActor;
    type: ReportType;
    fileId: string;
    description: string;
    submittedAt: Date;
  }): Promise<{ reportId: string; version: number } | null> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await transaction.$queryRaw<Array<{ id: string; professorId: string; name: string }>>(Prisma.sql`
        SELECT "team"."id", "team"."professorId", "team"."name"
        FROM "team"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" = 'CONFIRMED'
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR (
              ${input.actor.role}::"UserRole" = 'STUDENT'
              AND EXISTS (
                SELECT 1 FROM "team_member"
                WHERE "teamId" = "team"."id" AND "studentId" = ${input.actor.id}
              )
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
      await createReportActivityNotifications(transaction, [{
        dedupeKey: `report-submitted:${reportVersionId}`,
        recipientId: authorized[0].professorId,
        title: `${authorized[0].name} 보고서가 제출되었습니다`,
        body: `${reportTypeLabel(input.type)} ${version}버전이 제출되었습니다. 최신 파일과 설명을 검토해 주세요.`,
        href: `/teams/${input.teamId}/reports`,
        createdAt: input.submittedAt,
      }]);
      return { reportId: report.id, version };
    });
  }

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
      const teams = await transaction.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
        SELECT "team"."id", "team"."name"
        FROM "report_version"
        JOIN "report" ON "report"."id" = "report_version"."reportId"
        JOIN "team" ON "team"."id" = "report"."teamId"
        WHERE "report_version"."id" = ${input.reportVersionId}
          AND "team"."status" = 'CONFIRMED'
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR (
              ${input.actor.role}::"UserRole" = 'PROFESSOR'
              AND "team"."professorId" = ${input.actor.id}
            )
          )
        FOR UPDATE OF "team"
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
        select: { version: true, report: { select: { type: true } } },
      });
      const members = await transaction.teamMember.findMany({
        where: { teamId: teams[0].id },
        select: { studentId: true },
      });
      if (reportVersion) {
        const approved = input.decision === "APPROVED";
        await createReportActivityNotifications(transaction, members.map(({ studentId }) => ({
          dedupeKey: `report-decision:${input.reportVersionId}:${input.decision}:${studentId}`,
          recipientId: studentId,
          title: approved ? `${reportTypeLabel(reportVersion.report.type)}가 승인되었습니다` : `${reportTypeLabel(reportVersion.report.type)}에 수정 요청이 있습니다`,
          body: approved
            ? `${teams[0].name}의 ${reportVersion.version}버전 보고서가 승인되었습니다.`
            : input.comment,
          href: `/teams/${teams[0].id}/reports`,
          createdAt: input.decidedAt,
        })));
      }
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: input.decision === "APPROVED" ? "REPORT_APPROVED" : "REPORT_REVISION_REQUESTED",
        targetType: "REPORT_VERSION",
        targetId: input.reportVersionId,
        metadata: { teamId: teams[0].id, decision: input.decision },
        createdAt: input.decidedAt,
      } });
      return true;
    });
  }

  registerArtifact(input: {
    teamId: string;
    actor: CurrentActor;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
    createdAt: Date;
  }): Promise<{ id: string } | null> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "team"."id"
        FROM "team"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" = 'CONFIRMED'
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR (
              ${input.actor.role}::"UserRole" = 'STUDENT'
              AND EXISTS (
                SELECT 1 FROM "team_member"
                WHERE "teamId" = "team"."id" AND "studentId" = ${input.actor.id}
              )
              AND ${input.createdAt} BETWEEN "topic"."submissionStartsAt" AND "topic"."submissionEndsAt"
            )
          )
        FOR UPDATE OF "team"
      `);
      if (authorized.length !== 1) return null;
      if (input.fileId) {
        const files = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id" FROM "stored_file"
          WHERE "id" = ${input.fileId}
            AND "teamId" = ${input.teamId}
            AND "ownerId" = ${input.actor.id}
            AND "purpose" = 'ARTIFACT'
            AND "status" = 'READY'
          FOR UPDATE
        `);
        if (files.length !== 1) return null;
      }
      const artifact = await transaction.artifact.create({
        data: {
          id: randomUUID(),
          teamId: input.teamId,
          registeredById: input.actor.id,
          type: input.type,
          title: input.title,
          fileId: input.fileId,
          externalUrl: input.externalUrl,
          createdAt: input.createdAt,
        },
        select: { id: true },
      });
      return artifact;
    });
  }
}

function reportTypeLabel(type: ReportType) {
  return type === "START" ? "착수 보고서" : type === "MIDTERM" ? "중간 보고서" : "결과 보고서";
}
