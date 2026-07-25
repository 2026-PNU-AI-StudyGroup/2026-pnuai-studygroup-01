import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  TeamApplicationDraftSummary,
  TeamApplicationInvitationRepository,
  TeamApplicationInvitationSummary,
} from "@/modules/topic-application/application/topic-application-ports";
import { areActiveStudents } from "@/modules/topic-application/infrastructure/prisma-topic-application-utils";

type InvitationResponse =
  | "PENDING"
  | "APPLICATION_CREATED"
  | "DECLINED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOPIC_UNAVAILABLE"
  | "MEMBER_UNAVAILABLE";

export class PrismaTeamApplicationInvitationRepository
  implements TeamApplicationInvitationRepository
{
  constructor(private readonly client: PrismaClient) {}

  async listForInvitee(
    email: string,
  ): Promise<TeamApplicationInvitationSummary[]> {
    const invitations = await this.client.teamApplicationInvitation.findMany({
      where: { email: email.trim().toLowerCase() },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        draftId: true,
        status: true,
        createdAt: true,
        draft: {
          select: {
            topicId: true,
            topic: { select: { title: true } },
            leader: { select: { name: true, email: true } },
          },
        },
      },
    });
    return invitations.map(({ draft, ...invitation }) => ({
      ...invitation,
      topicId: draft.topicId,
      topicTitle: draft.topic.title,
      leaderName: draft.leader.name,
      leaderEmail: draft.leader.email,
    }));
  }

  async listByLeader(leaderId: string): Promise<TeamApplicationDraftSummary[]> {
    const drafts = await this.client.teamApplicationDraft.findMany({
      where: { leaderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        topicId: true,
        createdAt: true,
        topic: { select: { title: true } },
        invitations: {
          orderBy: { createdAt: "asc" },
          select: { email: true, status: true },
        },
      },
    });
    return drafts.map(({ topic, ...draft }) => ({
      ...draft,
      topicTitle: topic.title,
    }));
  }

  cancelDraft(draftId: string, leaderId: string): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${draftId}, 3))::text AS "lock"`,
      );
      const { count } = await transaction.teamApplicationDraft.deleteMany({
        where: { id: draftId, leaderId },
      });
      return count === 1;
    });
  }

  respond(
    invitationId: string,
    actor: { id: string; email: string },
    decision: "ACCEPT" | "DECLINE",
    respondedAt: Date,
  ): Promise<InvitationResponse> {
    return this.client.$transaction(async (transaction) => {
      const initial = await transaction.teamApplicationInvitation.findUnique({
        where: { id: invitationId },
        select: { draftId: true, draft: { select: { topicId: true } } },
      });
      if (!initial) return "NOT_FOUND";

      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${initial.draftId}, 3))::text AS "lock"`,
      );
      const programRows = await transaction.$queryRaw<Array<{
        status: "DRAFT" | "OPEN" | "CLOSED";
      }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program"
        JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.draft.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topicRows = await transaction.$queryRaw<Array<{
        id: string;
        academicCycleId: string;
        capacity: number;
        applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM";
        status: "DRAFT" | "PUBLISHED" | "CLOSED";
        recruitmentStartsAt: Date;
        recruitmentEndsAt: Date;
      }>>(Prisma.sql`
        SELECT "id", "academicCycleId", "capacity", "applicationMode", "status", "recruitmentStartsAt", "recruitmentEndsAt"
        FROM "topic"
        WHERE "id" = ${initial.draft.topicId}
        FOR UPDATE
      `);
      const topic = topicRows[0];
      if (
        programRows[0]?.status !== "OPEN" ||
        !topic ||
        topic.status !== "PUBLISHED" ||
        topic.applicationMode === "INDIVIDUAL_ONLY" ||
        topic.recruitmentStartsAt > respondedAt ||
        topic.recruitmentEndsAt <= respondedAt
      ) {
        return "TOPIC_UNAVAILABLE";
      }

      const teamRows = await transaction.$queryRaw<Array<{
        status: "FORMING" | "CONFIRMED" | "CLOSED";
      }>>(Prisma.sql`
        SELECT "status" FROM "team" WHERE "topicId" = ${topic.id} FOR UPDATE
      `);
      if (teamRows[0] && teamRows[0].status !== "FORMING") {
        return "TOPIC_UNAVAILABLE";
      }

      const invitation = await transaction.teamApplicationInvitation.findUnique({
        where: { id: invitationId },
        select: { id: true, draftId: true, email: true, status: true },
      });
      if (
        !invitation ||
        invitation.email !== actor.email.trim().toLowerCase()
      ) {
        return "NOT_FOUND";
      }
      if (invitation.status !== "PENDING") return "CONFLICT";
      if (decision === "DECLINE") {
        await transaction.teamApplicationInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "DECLINED",
            inviteeId: actor.id,
            respondedAt,
          },
        });
        return "DECLINED";
      }

      const draft = await transaction.teamApplicationDraft.findUnique({
        where: { id: invitation.draftId },
        select: { id: true, topicId: true, leaderId: true },
      });
      if (!draft) return "NOT_FOUND";
      const draftAnswers = await transaction.teamApplicationDraftAnswer.findMany({
        where: { draftId: draft.id },
        select: { questionId: true, value: true },
      });
      const storedInvitations =
        await transaction.teamApplicationInvitation.findMany({
          where: { draftId: draft.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            inviteeId: true,
            email: true,
            status: true,
          },
        });
      const invitations = storedInvitations.map((item) =>
        item.id === invitation.id
          ? { ...item, status: "ACCEPTED" as const, inviteeId: actor.id }
          : item,
      );
      if (invitations.some(({ status }) => status === "DECLINED")) {
        return "CONFLICT";
      }
      if (invitations.some(({ status }) => status === "PENDING")) {
        await transaction.teamApplicationInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            inviteeId: actor.id,
            respondedAt,
          },
        });
        return "PENDING";
      }

      const memberIds = invitations
        .map(({ inviteeId }) => inviteeId)
        .filter((id): id is string => Boolean(id));
      if (memberIds.length !== invitations.length) return "MEMBER_UNAVAILABLE";
      const participantIds = [draft.leaderId, ...memberIds];
      const participants = await transaction.$queryRaw<Array<{
        id: string;
        role: "STUDENT" | "PROFESSOR" | "ADMIN";
        isActive: boolean;
      }>>(Prisma.sql`
        SELECT "id", "role", "isActive" FROM "user" WHERE "id" IN (${Prisma.join(participantIds)}) ORDER BY "id" FOR UPDATE
      `);
      if (!areActiveStudents(participants, participantIds.length)) {
        return "MEMBER_UNAVAILABLE";
      }
      const membershipCount = await transaction.teamMember.count({
        where: {
          academicCycleId: topic.academicCycleId,
          studentId: { in: participantIds },
        },
      });
      const existingApplicationCount =
        await transaction.topicApplication.count({
          where: { topicId: topic.id, studentId: { in: participantIds } },
        });
      const team = await transaction.team.findUnique({
        where: { topicId: topic.id },
        select: { _count: { select: { members: true } } },
      });
      if (membershipCount > 0 || existingApplicationCount > 0) {
        return "MEMBER_UNAVAILABLE";
      }
      if (
        (team?._count.members ?? 0) + participantIds.length >
        topic.capacity
      ) {
        return "TOPIC_UNAVAILABLE";
      }

      await transaction.teamApplicationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          inviteeId: actor.id,
          respondedAt,
        },
      });
      const group = await transaction.topicApplicationGroup.create({
        data: {
          topicId: topic.id,
          leaderId: draft.leaderId,
          kind: "TEAM",
          createdAt: respondedAt,
        },
        select: { id: true },
      });
      await transaction.topicApplicationAnswer.createMany({
        data: draftAnswers.map((answer) => ({ groupId: group.id, ...answer })),
      });
      await transaction.topicApplication.createMany({
        data: participantIds.map((studentId, index) => ({
          id: randomUUID(),
          topicId: topic.id,
          studentId,
          groupId: group.id,
          participantRole: index === 0 ? "LEADER" : "MEMBER",
          message: "교수 정의 지원서",
          skills: ["교수 정의 지원서"],
          desiredRole: "교수 정의 지원서",
          availability: "교수 정의 지원서",
          status: "PENDING",
          decidedAt: null,
          createdAt: respondedAt,
          updatedAt: respondedAt,
        })),
      });
      await transaction.teamApplicationDraft.delete({ where: { id: draft.id } });
      return "APPLICATION_CREATED";
    }).catch((error: unknown) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return "MEMBER_UNAVAILABLE" as const;
      }
      throw error;
    });
  }
}
