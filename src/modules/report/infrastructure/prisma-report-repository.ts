import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ReportRepository,
  ReportWorkspace,
} from "@/modules/report/application/report-ports";
import type {
  ApprovalDecision,
  ArtifactType,
  ReportType,
} from "@/modules/report/domain/report-policy";

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly client: PrismaClient) {}

  async findWorkspace(teamId: string, actor: CurrentActor): Promise<ReportWorkspace | null> {
    const team = await this.client.team.findFirst({
      where: { id: teamId, ...teamActorWhere(actor) },
      select: {
        reports: {
          orderBy: { type: "asc" },
          select: {
            id: true,
            type: true,
            versions: {
              orderBy: { version: "desc" },
              select: {
                id: true,
                version: true,
                fileId: true,
                description: true,
                submittedAt: true,
                file: { select: { originalName: true } },
                submitter: { select: { name: true } },
                decision: {
                  select: {
                    decision: true,
                    comment: true,
                    decidedAt: true,
                    reviewer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        artifacts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            title: true,
            fileId: true,
            externalUrl: true,
            createdAt: true,
          },
        },
      },
    });
    if (!team) return null;
    return {
      reports: team.reports.map((report) => ({
        id: report.id,
        type: report.type,
        versions: report.versions.map(({ file, submitter, decision, ...version }) => ({
          ...version,
          fileName: file.originalName,
          submitterName: submitter.name,
          decision: decision ? {
            decision: decision.decision,
            comment: decision.comment,
            decidedAt: decision.decidedAt,
            reviewerName: decision.reviewer.name,
          } : undefined,
        })),
      })),
      artifacts: team.artifacts.map((artifact) => ({
        ...artifact,
        fileId: artifact.fileId ?? undefined,
        externalUrl: artifact.externalUrl ?? undefined,
      })),
    };
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
              AND ${input.submittedAt} BETWEEN "topic"."submissionStartsAt" AND "topic"."submissionEndsAt"
            )
          )
        FOR UPDATE OF "team"
      `);
      if (authorized.length !== 1) return null;
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

      const report = await transaction.report.upsert({
        where: { teamId_type: { teamId: input.teamId, type: input.type } },
        create: { teamId: input.teamId, type: input.type },
        update: {},
        select: { id: true },
      });
      await transaction.$executeRaw(Prisma.sql`
        SELECT 1 FROM "report" WHERE "id" = ${report.id} FOR UPDATE
      `);
      const latest = await transaction.reportVersion.aggregate({
        where: { reportId: report.id },
        _max: { version: true },
      });
      const version = (latest._max.version ?? 0) + 1;
      await transaction.reportVersion.create({
        data: {
          id: randomUUID(),
          reportId: report.id,
          version,
          fileId: input.fileId,
          submitterId: input.actor.id,
          description: input.description,
          submittedAt: input.submittedAt,
        },
      });
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
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "team"."id"
        FROM "report_version"
        JOIN "report" ON "report"."id" = "report_version"."reportId"
        JOIN "team" ON "team"."id" = "report"."teamId"
        WHERE "report_version"."id" = ${input.reportVersionId}
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

function teamActorWhere(actor: CurrentActor): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "PROFESSOR") return { professorId: actor.id };
  return { members: { some: { studentId: actor.id } } };
}
