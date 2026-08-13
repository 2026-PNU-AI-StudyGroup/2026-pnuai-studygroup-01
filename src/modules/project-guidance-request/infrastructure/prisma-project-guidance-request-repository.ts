import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createProjectRequestNotifications } from "@/modules/notification/infrastructure/notification-events";
import type {
  CreateProjectGuidanceRequestResult,
  ProjectGuidanceRequestPage,
  ProjectGuidanceRequestReader,
  ProjectGuidanceRequestWriter,
} from "@/modules/project-guidance-request/application/project-guidance-request-ports";
import { teamSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import {
  teamActorWhere,
  teamMemberSql,
} from "@/modules/team/infrastructure/prisma-team-workspace-authorization";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaProjectGuidanceRequestRepository
  implements ProjectGuidanceRequestReader, ProjectGuidanceRequestWriter
{
  constructor(private readonly client: PrismaClient) {}

  async findPage(
    teamId: string,
    actor: CurrentActor,
    requestedPage: number,
    pageSize: number,
  ): Promise<ProjectGuidanceRequestPage | null> {
    const team = await this.client.projectTeam.findFirst({
      where: { id: teamId, ...teamActorWhere(actor) },
      select: { id: true },
    });
    if (!team) return null;

    const [total, pendingTotal] = await Promise.all([
      this.client.projectGuidanceRequest.count({ where: { projectTeamId: teamId } }),
      this.client.projectGuidanceRequest.count({ where: { projectTeamId: teamId, status: "PENDING" } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const rows = await this.client.projectGuidanceRequest.findMany({
      where: { projectTeamId: teamId },
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        projectTeamId: true,
        requesterId: true,
        kind: true,
        title: true,
        content: true,
        referenceUrl: true,
        preferredAt: true,
        status: true,
        response: true,
        scheduledAt: true,
        respondedAt: true,
        canceledAt: true,
        createdAt: true,
        requester: { select: { name: true } },
        responder: { select: { name: true } },
      },
    });

    return {
      items: rows.map(({ requester, responder, projectTeamId, ...request }) => ({
        ...request,
        teamId: projectTeamId,
        requesterName: requester.name,
        responderName: responder?.name ?? null,
      })),
      page,
      totalPages,
      total,
      pendingTotal,
    };
  }

  create(input: {
    teamId: string;
    actor: CurrentActor;
    kind: "MEETING" | "REVIEW";
    title: string;
    content: string;
    referenceUrl: string | null;
    preferredAt: Date | null;
    requestedAt: Date;
  }): Promise<CreateProjectGuidanceRequestResult> {
    return this.client.$transaction(async (transaction) => {
      const lockKey = `${input.teamId}:${input.actor.id}:${input.kind}`;
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 29))
      `);
      const teams = await transaction.$queryRaw<Array<{
        id: string;
        name: string;
        managerId: string;
        projectId: string;
        requesterName: string;
      }>>(Prisma.sql`
        SELECT
          "project_team"."id",
          "project_team"."name",
          "topic"."managerId",
          "project_team"."projectId",
          "requester"."name" AS "requesterName"
        FROM "project_team"
        JOIN "topic" ON "topic"."id" = "project_team"."projectId"
        JOIN "project_program" ON "project_program"."id" = "topic"."programId"
        JOIN "user" AS "requester" ON "requester"."id" = ${input.actor.id}
        JOIN "user" AS "professor" ON "professor"."id" = "topic"."managerId"
        WHERE "project_team"."id" = ${input.teamId}
          AND "project_team"."confirmedAt" IS NOT NULL
          AND "topic"."status" = 'ACTIVE'
          AND "project_program"."endsAt" > ${input.requestedAt}
          AND "project_program"."advisorEnabled" = TRUE
          AND "requester"."accountStatus" = 'ACTIVE'
          AND "professor"."role" = 'PROFESSOR'
          AND "professor"."accountStatus" = 'ACTIVE'
          AND ${teamMemberSql(input.actor.id)}
        FOR UPDATE OF "project_team"
      `);
      const team = teams[0];
      if (!team) return "NOT_ALLOWED";

      const pending = await transaction.projectGuidanceRequest.findFirst({
        where: {
          projectTeamId: input.teamId,
          requesterId: input.actor.id,
          kind: input.kind,
          status: "PENDING",
        },
        select: { id: true },
      });
      if (pending) return "PENDING_EXISTS";

      const id = randomUUID();
      await transaction.projectGuidanceRequest.create({
        data: {
          id,
          projectTeamId: input.teamId,
          requesterId: input.actor.id,
          kind: input.kind,
          title: input.title,
          content: input.content,
          referenceUrl: input.referenceUrl,
          preferredAt: input.preferredAt,
          createdAt: input.requestedAt,
          updatedAt: input.requestedAt,
        },
      });
      await enqueueTranslations(transaction, [input.title, input.content]);

      const assistants = await transaction.projectAssistant.findMany({
        where: { topicId: team.projectId },
        select: { userId: true },
      });
      const supervisorIds = [...new Set([
        team.managerId,
        ...assistants.map(({ userId }) => userId),
      ])].filter((userId) => userId !== input.actor.id);
      await createProjectRequestNotifications(
        transaction,
        supervisorIds.map((recipientId) => ({
          recipientId,
          title: input.kind === "MEETING"
            ? "새 회의 요청이 도착했습니다"
            : "새 검토 요청이 도착했습니다",
          body: `${team.requesterName}님이 ${team.name} 프로젝트에서 ${input.title} 요청을 보냈습니다.`,
          href: `/projects/${team.projectId}/requests`,
          dedupeKey: `project-guidance-request:${id}:${recipientId}`,
          createdAt: input.requestedAt,
        })),
      );
      return "CREATED";
    });
  }

  respond(input: {
    requestId: string;
    actor: CurrentActor;
    response: string;
    scheduledAt: Date | null;
    respondedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program"
        JOIN "topic" ON "topic"."programId" = "project_program"."id"
        JOIN "project_team" ON "project_team"."projectId" = "topic"."id"
        JOIN "project_guidance_request" ON "project_guidance_request"."projectTeamId" = "project_team"."id"
        WHERE "project_guidance_request"."id" = ${input.requestId}
        FOR UPDATE OF "project_program"
      `);
      if (programs.length !== 1) return false;

      const requests = await transaction.$queryRaw<Array<{
        id: string;
        teamId: string;
        teamName: string;
        requesterId: string;
        kind: "MEETING" | "REVIEW";
        projectId: string;
      }>>(Prisma.sql`
        SELECT
          "project_guidance_request"."id",
          "project_team"."id" AS "teamId",
          "project_team"."projectId",
          "project_team"."name" AS "teamName",
          "project_guidance_request"."requesterId",
          "project_guidance_request"."kind"
        FROM "project_guidance_request"
        JOIN "project_team" ON "project_team"."id" = "project_guidance_request"."projectTeamId"
        JOIN "topic" ON "topic"."id" = "project_team"."projectId"
        JOIN "project_program" ON "project_program"."id" = "topic"."programId"
        WHERE "project_guidance_request"."id" = ${input.requestId}
          AND "project_guidance_request"."status" = 'PENDING'
          AND "project_team"."confirmedAt" IS NOT NULL
          AND "topic"."status" = 'ACTIVE'
          AND "project_program"."endsAt" > ${input.respondedAt}
          AND ${teamSupervisorSql(input.actor)}
          AND (
            ${input.scheduledAt}::TIMESTAMP IS NULL
            OR (
              "project_guidance_request"."kind" = 'MEETING'
              AND ${input.scheduledAt}::TIMESTAMP > ${input.respondedAt}
              AND ${input.scheduledAt}::TIMESTAMP <= "project_program"."executionEndsAt"
            )
          )
        FOR UPDATE OF "project_guidance_request"
      `);
      const request = requests[0];
      if (!request) return false;

      await transaction.projectGuidanceRequest.update({
        where: { id: request.id },
        data: {
          status: "ANSWERED",
          response: input.response,
          scheduledAt: input.scheduledAt,
          responderId: input.actor.id,
          respondedAt: input.respondedAt,
          updatedAt: input.respondedAt,
        },
      });
      await enqueueTranslations(transaction, [input.response]);
      await createProjectRequestNotifications(transaction, [{
        recipientId: request.requesterId,
        title: request.kind === "MEETING"
          ? "회의 요청에 답변이 도착했습니다"
          : "검토 요청에 답변이 도착했습니다",
        body: notificationSummary(input.response),
          href: `/projects/${request.projectId}/requests`,
        dedupeKey: `project-guidance-response:${request.id}`,
        createdAt: input.respondedAt,
      }]);
      return true;
    });
  }

  async cancel(input: {
    requestId: string;
    actor: CurrentActor;
    canceledAt: Date;
  }): Promise<boolean> {
    const result = await this.client.projectGuidanceRequest.updateMany({
      where: {
        id: input.requestId,
        requesterId: input.actor.id,
        status: "PENDING",
        projectTeam: {
          confirmedAt: { not: null },
          project: {
            status: "ACTIVE",
            program: { endsAt: { gt: input.canceledAt } },
          },
        },
      },
      data: {
        status: "CANCELED",
        canceledAt: input.canceledAt,
        updatedAt: input.canceledAt,
      },
    });
    return result.count === 1;
  }
}

function notificationSummary(response: string): string {
  return response.length <= 160 ? response : `${response.slice(0, 157)}...`;
}
