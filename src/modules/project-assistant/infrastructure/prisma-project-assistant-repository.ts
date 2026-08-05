import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  InviteProjectAssistantResult,
  ProjectAssistantManagement,
  ProjectAssistantReader,
  ProjectAssistantWriter,
} from "@/modules/project-assistant/application/project-assistant-ports";
import {
  topicSupervisorSql,
  topicSupervisorWhere,
} from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export class PrismaProjectAssistantRepository
  implements ProjectAssistantReader, ProjectAssistantWriter
{
  constructor(private readonly client: PrismaClient) {}

  async hasSupervisedTopic(actor: CurrentActor): Promise<boolean> {
    const topic = await this.client.topic.findFirst({
      where: topicSupervisorWhere(actor),
      select: { id: true },
    });
    return topic !== null;
  }

  async findManagement(
    topicId: string,
    actor: CurrentActor,
  ): Promise<ProjectAssistantManagement | null> {
    const topic = await this.client.topic.findFirst({
      where: { id: topicId, ...topicSupervisorWhere(actor) },
      select: {
        id: true,
        title: true,
        managerId: true,
        manager: { select: { name: true } },
        program: { select: { advisorEnabled: true } },
        assistants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            userId: true,
            createdAt: true,
            user: { select: { name: true, email: true, role: true } },
          },
        },
        assistantInvitations: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            inviteeId: true,
            createdAt: true,
            invitee: { select: { name: true, email: true, role: true } },
          },
        },
      },
    });
    if (!topic) return null;
    return {
      topicId: topic.id,
      topicTitle: topic.title,
      managerId: topic.managerId,
      managerName: topic.manager?.name ?? null,
      advisorEnabled: topic.program.advisorEnabled,
      assistants: topic.assistants.map(({ user, ...assistant }) => ({
        ...assistant,
        ...user,
      })),
      pendingInvitations: topic.assistantInvitations.map(({ invitee, ...invitation }) => ({
        ...invitation,
        inviteeName: invitee.name,
        inviteeEmail: invitee.email,
        inviteeRole: invitee.role,
      })),
    };
  }

  async listPendingInvitations(inviteeId: string) {
    const invitations = await this.client.projectAssistantInvitation.findMany({
      where: { inviteeId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        topicId: true,
        createdAt: true,
        topic: { select: { title: true, program: { select: { advisorEnabled: true } } } },
        inviter: { select: { name: true } },
      },
    });
    return invitations.map(({ topic, inviter, ...invitation }) => ({
      ...invitation,
      topicTitle: topic.title,
      inviterName: inviter.name,
      advisorEnabled: topic.program.advisorEnabled,
    }));
  }

  invite(input: {
    topicId: string;
    actor: CurrentActor;
    email: string;
    invitedAt: Date;
  }): Promise<InviteProjectAssistantResult> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${input.topicId}, 11))
      `);
      const topics = await transaction.$queryRaw<Array<{ managerId: string | null; title: string; advisorEnabled: boolean }>>(Prisma.sql`
        SELECT "topic"."managerId", "topic"."title", "project_program"."advisorEnabled"
        FROM "topic"
        JOIN "project_program" ON "project_program"."id" = "topic"."programId"
        WHERE "topic"."id" = ${input.topicId}
          AND ${topicSupervisorSql(input.actor)}
        FOR UPDATE
      `);
      const topic = topics[0];
      if (!topic) return "FORBIDDEN";
      const invitee = await transaction.user.findUnique({
        where: { email: input.email },
        select: { id: true, isActive: true },
      });
      if (!invitee) return "NOT_FOUND";
      if (!invitee.isActive) return "INACTIVE";
      if (invitee.id === topic.managerId) return "SELF";
      if (await transaction.projectAssistant.findUnique({
        where: { topicId_userId: { topicId: input.topicId, userId: invitee.id } },
        select: { id: true },
      })) return "ALREADY_ASSISTANT";
      if (await transaction.projectAssistantInvitation.findFirst({
        where: { topicId: input.topicId, inviteeId: invitee.id, status: "PENDING" },
        select: { id: true },
      })) return "ALREADY_INVITED";

      const invitationId = randomUUID();
      await transaction.projectAssistantInvitation.create({
        data: {
          id: invitationId,
          topicId: input.topicId,
          inviteeId: invitee.id,
          inviterId: input.actor.id,
          createdAt: input.invitedAt,
          updatedAt: input.invitedAt,
        },
      });
      await transaction.notification.create({
        data: {
          recipientId: invitee.id,
          type: "SYSTEM",
          title: "프로젝트 조교 초대가 도착했습니다",
          body: `${topic.title} 프로젝트에서 ${topic.advisorEnabled ? "지도교수와 동일한" : "프로젝트"} 운영 권한을 요청했습니다.`,
          href: "/dashboard?assistantInvitations=open",
          dedupeKey: `project-assistant-invitation:${invitationId}`,
          createdAt: input.invitedAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actor.id,
          action: "PROJECT_ASSISTANT_INVITED",
          targetType: "PROJECT_ASSISTANT_INVITATION",
          targetId: invitationId,
          metadata: { topicId: input.topicId, inviteeId: invitee.id },
          createdAt: input.invitedAt,
        },
      });
      return "INVITED";
    });
  }

  respond(input: {
    invitationId: string;
    actor: CurrentActor;
    decision: "ACCEPT" | "DECLINE";
    respondedAt: Date;
  }): Promise<"ACCEPTED" | "DECLINED" | "INVALID"> {
    return this.client.$transaction(async (transaction) => {
      const invitations = await transaction.$queryRaw<Array<{
        id: string;
        topicId: string;
        inviterId: string;
      }>>(Prisma.sql`
        SELECT "id", "topicId", "inviterId"
        FROM "project_assistant_invitation"
        WHERE "id" = ${input.invitationId}
          AND "inviteeId" = ${input.actor.id}
          AND "status" = 'PENDING'
        FOR UPDATE
      `);
      const invitation = invitations[0];
      if (!invitation) return "INVALID";
      const activeInvitee = await transaction.user.findFirst({
        where: { id: input.actor.id, isActive: true },
        select: { id: true },
      });
      if (!activeInvitee) return "INVALID";
      const status = input.decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      await transaction.projectAssistantInvitation.update({
        where: { id: invitation.id },
        data: { status, respondedAt: input.respondedAt },
      });
      if (status === "ACCEPTED") {
        await transaction.projectAssistant.upsert({
          where: {
            topicId_userId: {
              topicId: invitation.topicId,
              userId: input.actor.id,
            },
          },
          create: {
            topicId: invitation.topicId,
            userId: input.actor.id,
            grantedById: invitation.inviterId,
            createdAt: input.respondedAt,
          },
          update: {},
        });
        await transaction.auditLog.create({
          data: {
            actorId: input.actor.id,
            action: "PROJECT_ASSISTANT_ACCEPTED",
            targetType: "TOPIC",
            targetId: invitation.topicId,
            metadata: { invitationId: invitation.id },
            createdAt: input.respondedAt,
          },
        });
      }
      return status;
    });
  }

  cancelInvitation(input: {
    invitationId: string;
    actor: CurrentActor;
    canceledAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const invitations = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "project_assistant_invitation"."id"
        FROM "project_assistant_invitation"
        JOIN "topic" ON "topic"."id" = "project_assistant_invitation"."topicId"
        WHERE "project_assistant_invitation"."id" = ${input.invitationId}
          AND "project_assistant_invitation"."status" = 'PENDING'
          AND ${topicSupervisorSql(input.actor)}
        FOR UPDATE OF "project_assistant_invitation"
      `);
      if (!invitations[0]) return false;
      await transaction.projectAssistantInvitation.update({
        where: { id: input.invitationId },
        data: { status: "CANCELED", respondedAt: input.canceledAt },
      });
      return true;
    });
  }

  remove(input: {
    topicId: string;
    assistantUserId: string;
    actor: CurrentActor;
    removedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const topics = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "topic"."id"
        FROM "topic"
        WHERE "topic"."id" = ${input.topicId}
          AND ${topicSupervisorSql(input.actor)}
        FOR UPDATE
      `);
      if (!topics[0]) return false;
      const removed = await transaction.projectAssistant.deleteMany({
        where: { topicId: input.topicId, userId: input.assistantUserId },
      });
      if (removed.count !== 1) return false;
      await transaction.projectAssistantInvitation.updateMany({
        where: {
          topicId: input.topicId,
          inviterId: input.assistantUserId,
          status: "PENDING",
        },
        data: { status: "CANCELED", respondedAt: input.removedAt },
      });
      await transaction.notification.create({
        data: {
          recipientId: input.assistantUserId,
          type: "SYSTEM",
          title: "프로젝트 조교 권한이 해제되었습니다",
          body: "프로젝트 운영 권한이 해제되어 더 이상 지도교수 권한으로 접근할 수 없습니다.",
          href: "/dashboard",
          dedupeKey: `project-assistant-removed:${input.topicId}:${input.assistantUserId}:${input.removedAt.toISOString()}`,
          createdAt: input.removedAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actor.id,
          action: "PROJECT_ASSISTANT_REMOVED",
          targetType: "TOPIC",
          targetId: input.topicId,
          metadata: { assistantUserId: input.assistantUserId },
          createdAt: input.removedAt,
        },
      });
      return true;
    });
  }
}
