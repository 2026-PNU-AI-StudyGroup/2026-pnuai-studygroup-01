import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ArchivedProject,
  ArchivedProjectReader,
  TeamCloser,
} from "@/modules/team/application/archive-projects";

export class PrismaTeamArchiveRepository implements ArchivedProjectReader, TeamCloser {
  constructor(private readonly client: PrismaClient) {}

  close(teamId: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string; topicId: string }>>(Prisma.sql`
        SELECT "team"."id", "team"."topicId"
        FROM "team"
        WHERE "team"."id" = ${teamId}
          AND "team"."status" = 'CONFIRMED'
          AND (
            ${actor.role}::"UserRole" = 'ADMIN'
            OR (
              ${actor.role}::"UserRole" = 'PROFESSOR'
              AND "team"."professorId" = ${actor.id}
            )
          )
        FOR UPDATE
      `);
      const team = teams[0];
      if (!team) return false;

      const approved = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "report_version"."id"
        FROM "report"
        JOIN "report_version" ON "report_version"."reportId" = "report"."id"
        JOIN "approval_decision" ON "approval_decision"."reportVersionId" = "report_version"."id"
        WHERE "report"."teamId" = ${teamId}
          AND "report"."type" = 'FINAL'
          AND "report_version"."version" = (
            SELECT max("latest"."version")
            FROM "report_version" AS "latest"
            WHERE "latest"."reportId" = "report"."id"
          )
          AND "approval_decision"."decision" = 'APPROVED'
      `);
      if (approved.length !== 1) return false;
      const result = await transaction.team.updateMany({
        where: { id: teamId, status: "CONFIRMED" },
        data: { status: "CLOSED" },
      });
      if (result.count === 1) {
        await transaction.topic.updateMany({
          where: { id: team.topicId },
          data: { status: "CLOSED" },
        });
        await transaction.topicApplication.updateMany({
          where: { topicId: team.topicId, status: "PENDING" },
          data: { status: "REJECTED", decidedAt: new Date() },
        });
      }
      return result.count === 1;
    });
  }

  async countClosed(): Promise<number> {
    return this.client.team.count({ where: { status: "CLOSED" } });
  }

  async listClosed(input: { offset: number; limit: number }): Promise<ArchivedProject[]> {
    const ids = await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "team"."id"
      FROM "team"
      JOIN "topic" ON "topic"."id" = "team"."topicId"
      JOIN "academic_cycle" ON "academic_cycle"."id" = "topic"."academicCycleId"
      WHERE "team"."status" = 'CLOSED'
      ORDER BY "academic_cycle"."academicYear" DESC,
        "academic_cycle"."term" DESC, "team"."name" ASC, "team"."id" ASC
      LIMIT ${input.limit} OFFSET ${input.offset}
    `);
    if (ids.length === 0) return [];
    const order = new Map(ids.map(({ id }, index) => [id, index]));
    const teams = await this.client.team.findMany({
      where: { id: { in: ids.map(({ id }) => id) }, status: "CLOSED" },
      select: {
        id: true,
        name: true,
        topic: {
          select: {
            title: true,
            description: true,
            author: { select: { name: true } },
            academicCycle: { select: { academicYear: true, term: true } },
          },
        },
        members: {
          orderBy: { joinedAt: "asc" },
          select: { student: { select: { name: true } } },
        },
        artifacts: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            title: true,
            fileId: true,
            externalUrl: true,
            file: { select: { originalName: true } },
          },
        },
      },
    });
    const projects = teams.map((team) => ({
      id: team.id,
      academicYear: team.topic.academicCycle.academicYear,
      term: team.topic.academicCycle.term,
      teamName: team.name,
      topicTitle: team.topic.title,
      topicDescription: team.topic.description,
      professorName: team.topic.author.name,
      memberNames: team.members.map(({ student }) => student.name),
      artifacts: team.artifacts.map(({ file, ...artifact }) => ({
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        fileId: artifact.fileId ?? undefined,
        fileName: file?.originalName,
        externalUrl: artifact.externalUrl ?? undefined,
      })),
    })).sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
    return projects;
  }
}
