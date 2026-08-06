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
    const team = await this.client.team.findFirst({
      where: { id: teamId, ...teamActorWhere(actor) },
      select: { id: true },
    });
    if (!team) return null;

    const [total, pendingTotal] = await Promise.all([
      this.client.projectGuidanceRequest.count({ where: { teamId } }),
      this.client.projectGuidanceRequest.count({ where: { teamId, status: "PENDING" } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const rows = await this.client.projectGuidanceRequest.findMany({
      where: { teamId },
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        teamId: true,
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
      items: rows.map(({ requester, responder, ...request }) => ({
        ...request,
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
        professorId: string;
        topicId: string;
        requesterName: string;
      }>>(Prisma.sql`
        SELECT
          "team"."id",
          "team"."name",
          "team"."professorId",
          "team"."topicId",
          "requester"."name" AS "requesterName"
        FROM "team"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        JOIN "project_program" ON "project_program"."id" = "topic"."programId"
        JOIN "user" AS "requester" ON "requester"."id" = ${input.actor.id}
        JOIN "user" AS "professor" ON "professor"."id" = "team"."professorId"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" = 'CONFIRMED'
          AND "project_program"."advisorEnabled" = TRUE
          AND "requester"."isActive" = TRUE
          AND "professor"."role" = 'PROFESSOR'
          AND "professor"."isActive" = TRUE
          AND ${teamMemberSql(input.actor.id)}
          AND (
            ${input.kind}::"ProjectGuidanceRequestKind" = 'REVIEW'
            OR (
              ${input.preferredAt}::TIMESTAMP > ${input.requestedAt}
              AND ${input.preferredAt}::TIMESTAMP <= "topic"."executionEndsAt"
            )
          )
        FOR UPDATE OF "team"
      `);
      const team = teams[0];
      if (!team) return "NOT_ALLOWED";

      const pending = await transaction.projectGuidanceRequest.findFirst({
        where: {
          teamId: input.teamId,
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
          teamId: input.teamId,
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
        where: { topicId: team.topicId },
        select: { userId: true },
      });
      const supervisorIds = [...new Set([
        team.professorId,
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
          href: `/teams/${team.id}/requests`,
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
      const requests = await transaction.$queryRaw<Array<{
        id: string;
        teamId: string;
        teamName: string;
        requesterId: string;
        kind: "MEETING" | "REVIEW";
      }>>(Prisma.sql`
        SELECT
          "project_guidance_request"."id",
          "team"."id" AS "teamId",
          "team"."name" AS "teamName",
          "project_guidance_request"."requesterId",
          "project_guidance_request"."kind"
        FROM "project_guidance_request"
        JOIN "team" ON "team"."id" = "project_guidance_request"."teamId"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        WHERE "project_guidance_request"."id" = ${input.requestId}
          AND "project_guidance_request"."status" = 'PENDING'
          AND "team"."status" = 'CONFIRMED'
          AND ${teamSupervisorSql(input.actor)}
          AND (
            ${input.scheduledAt}::TIMESTAMP IS NULL
            OR (
              "project_guidance_request"."kind" = 'MEETING'
              AND ${input.scheduledAt}::TIMESTAMP > ${input.respondedAt}
              AND ${input.scheduledAt}::TIMESTAMP <= "topic"."executionEndsAt"
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
        href: `/teams/${request.teamId}/requests`,
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
        team: { status: "CONFIRMED" },
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
