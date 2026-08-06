import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import { createTopicApprovalNotification } from "@/modules/notification/infrastructure/notification-events";
import type { TopicApprovalRepository, TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaTopicApprovalRepository implements TopicApprovalRepository {
  constructor(private readonly client: PrismaClient) {}

  listProfessors() {
    return this.client.user.findMany({ where: { role: "PROFESSOR", isActive: true }, orderBy: [{ name: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true } });
  }

  create(input: TopicDraft & { route: "PROFESSOR" | "ADMIN"; requestedProfessorId: string | null; studentTeamId?: string; requestedAt: Date }): Promise<string | null> {
    return this.client.$transaction(async (transaction) => {
      const program = await transaction.projectProgram.findFirst({
        where: {
          id: input.programId,
          academicCycleId: input.academicCycleId,
          status: "OPEN",
          studentProjectCreationEnabled: true,
        },
        select: { id: true, advisorEnabled: true },
      });
      if (!program) return null;
      if (!program.advisorEnabled && input.route !== "ADMIN") return null;
      if (input.route === "PROFESSOR") {
        const professor = await transaction.user.findFirst({ where: { id: input.requestedProfessorId!, role: "PROFESSOR", isActive: true }, select: { id: true } });
        if (!professor) return null;
      }
      const studentTeam = input.studentTeamId
        ? await transaction.studentTeam.findFirst({
          where: { id: input.studentTeamId, leaderId: input.authorId, deletedAt: null },
          select: {
            id: true,
            members: {
              select: { studentId: true, student: { select: { role: true, isActive: true } } },
            },
          },
        })
        : null;
      if (input.studentTeamId) {
        if (
          !studentTeam ||
          studentTeam.members.length === 0 ||
          studentTeam.members.some(({ student }) => student.role !== "STUDENT" || !student.isActive)
        ) return null;
        const alreadyAssigned = await transaction.teamMember.count({
          where: {
            academicCycleId: input.academicCycleId,
            studentId: { in: studentTeam.members.map(({ studentId }) => studentId) },
          },
        });
        if (alreadyAssigned) return null;
      }
      const { applicationQuestions, route, requestedProfessorId, studentTeamId, requestedAt, ...topic } = input;
      const id = randomUUID();
      await transaction.topic.create({
        data: {
          id,
          ...topic,
          managerId: null,
          applicationMode: studentTeam ? "TEAM_ONLY" : topic.applicationMode,
          recruitmentEnabled: !studentTeam,
          capacity: studentTeam ? studentTeam.members.length : topic.capacity,
          status: "DRAFT",
          publishedAt: null,
          createdAt: requestedAt,
          updatedAt: requestedAt,
          applicationQuestions: { create: applicationQuestions.map((question, position) => ({ id: randomUUID(), ...question, position })) },
          approvalRequest: { create: { id: randomUUID(), requesterId: input.authorId, route, requestedProfessorId, studentTeamId: studentTeam ? studentTeamId : undefined, status: "PENDING", createdAt: requestedAt, updatedAt: requestedAt } },
        },
      });
      await enqueueTranslations(transaction, [
        topic.title,
        topic.description,
        ...topic.requiredSkills,
        ...topic.preferredSkills,
        topic.roleExpectations,
        topic.availabilityRequirement,
        ...applicationQuestions.map(({ label }) => label),
      ]);
      return id;
    });
  }

  async listVisible(
    actor: CurrentUser,
    status?: TopicApprovalRequestSummary["status"],
  ): Promise<TopicApprovalRequestSummary[]> {
    const visibility: Prisma.TopicApprovalRequestWhereInput = actor.role === "STUDENT"
      ? {
        OR: [
          { requesterId: actor.id },
          {
            studentTeam: {
              leaderId: actor.id,
              deletedAt: null,
            },
          },
        ],
      }
      : actor.role === "PROFESSOR"
        ? { route: "PROFESSOR", requestedProfessorId: actor.id }
        : { route: "ADMIN" };
    const where: Prisma.TopicApprovalRequestWhereInput = status
      ? { AND: [visibility, { status }] }
      : visibility;
    const requests = await this.client.topicApprovalRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        topic: { select: { title: true } },
        requester: { select: { name: true } },
        requestedProfessor: { select: { name: true } },
      },
    });
    return requests.map(({ topic, requester, requestedProfessor, ...request }) => ({
      ...request,
      topicTitle: topic.title,
      requesterName: requester.name,
      requestedProfessorName: requestedProfessor?.name ?? null,
    }));
  }

  decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "UNAVAILABLE"> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; topicId: string; topicTitle: string; requesterId: string; route: "PROFESSOR" | "ADMIN"; requestedProfessorId: string | null; studentTeamId: string | null; status: string }>>(Prisma.sql`
        SELECT "topic_approval_request"."id", "topic_approval_request"."topicId", "topic"."title" AS "topicTitle", "topic_approval_request"."requesterId", "topic_approval_request"."route", "topic_approval_request"."requestedProfessorId", "topic_approval_request"."studentTeamId", "topic_approval_request"."status"
        FROM "topic_approval_request"
        JOIN "topic" ON "topic"."id" = "topic_approval_request"."topicId"
        WHERE "topic_approval_request"."id" = ${input.requestId}
        FOR UPDATE OF "topic_approval_request"
      `);
      const request = rows[0];
      if (!request || request.status !== "PENDING") return "UNAVAILABLE";
      const permitted = request.route === "PROFESSOR"
        ? input.actorRole === "PROFESSOR" && request.requestedProfessorId === input.actorId
        : input.actorRole === "ADMIN";
      if (!permitted) return "FORBIDDEN";
      if (input.decision === "APPROVE") {
        const topic = await transaction.topic.findFirst({
          where: { id: request.topicId, status: "DRAFT", recruitmentEndsAt: { gt: input.decidedAt }, program: { status: "OPEN" } },
          select: { id: true, academicCycleId: true, authorId: true, title: true, capacity: true, recruitmentEnabled: true },
        });
        if (!topic) return "UNAVAILABLE";
        if (topic.recruitmentEnabled) {
          await transaction.topic.update({
            where: { id: topic.id },
            data: {
              managerId: input.actorId,
              status: "PUBLISHED",
              publishedAt: input.decidedAt,
            },
          });
        } else {
          if (!request.studentTeamId) return "UNAVAILABLE";
        const teamRows = await transaction.$queryRaw<Array<{ id: string; leaderId: string; name: string }>>(Prisma.sql`
          SELECT "id", "leaderId", "name"
          FROM "student_team"
          WHERE "id" = ${request.studentTeamId} AND "deletedAt" IS NULL
          FOR UPDATE
        `);
        const studentTeam = teamRows[0];
        if (!studentTeam) return "UNAVAILABLE";
        const members = await transaction.studentTeamMember.findMany({
          where: { teamId: studentTeam.id },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          select: { studentId: true, student: { select: { role: true, isActive: true } } },
        });
        if (
          members.length === 0 ||
          members.length !== topic.capacity ||
          members.some(({ student }) => student.role !== "STUDENT" || !student.isActive)
        ) return "UNAVAILABLE";
        const studentIds = members.map(({ studentId }) => studentId);
        const alreadyAssigned = await transaction.teamMember.count({
          where: { academicCycleId: topic.academicCycleId, studentId: { in: studentIds } },
        });
        if (alreadyAssigned) return "UNAVAILABLE";

        const groupId = randomUUID();
        await transaction.topicApplicationGroup.create({
          data: {
            id: groupId,
            topicId: topic.id,
            leaderId: studentTeam.leaderId,
            studentTeamId: studentTeam.id,
            kind: "TEAM",
            createdAt: input.decidedAt,
          },
        });
        const applications = members.map(({ studentId }) => ({
          id: randomUUID(),
          topicId: topic.id,
          studentId,
          groupId,
          participantRole: studentId === studentTeam.leaderId ? "LEADER" as const : "MEMBER" as const,
          message: "학생 제안 프로젝트 기존 팀 참여",
          skills: ["기존 팀 참여"],
          desiredRole: "팀 내 역할 협의",
          availability: "팀 일정에 따름",
          status: "ACCEPTED" as const,
          reviewComment: "프로젝트 승인과 동시에 참여 확정",
          decidedAt: input.decidedAt,
          createdAt: input.decidedAt,
          updatedAt: input.decidedAt,
        }));
        await transaction.topicApplication.createMany({ data: applications });
        await transaction.topic.update({
          where: { id: topic.id },
          data: {
            managerId: input.actorId,
            status: "PUBLISHED",
            publishedAt: input.decidedAt,
          },
        });
        const executionTeam = await transaction.team.create({
          data: {
            academicCycleId: topic.academicCycleId,
            topicId: topic.id,
            professorId: input.actorId,
            name: studentTeam.name,
            status: "CONFIRMED",
            createdAt: input.decidedAt,
            updatedAt: input.decidedAt,
          },
          select: { id: true },
        });
        await transaction.teamMember.createMany({
          data: applications.map((application) => ({
            teamId: executionTeam.id,
            academicCycleId: topic.academicCycleId,
            topicId: topic.id,
            studentId: application.studentId,
            applicationId: application.id,
            joinedAt: input.decidedAt,
          })),
        });
        }
      }
      const status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      await transaction.topicApprovalRequest.update({ where: { id: request.id }, data: { status, reviewComment: input.reviewComment, decidedById: input.actorId, decidedAt: input.decidedAt } });
      await createTopicApprovalNotification(transaction, {
        recipientId: request.requesterId,
        title: status === "APPROVED" ? "프로젝트 제안이 승인되었습니다" : "프로젝트 제안이 반려되었습니다",
        body: status === "APPROVED"
          ? `${request.topicTitle} 제안이 승인되어 공개되었습니다.`
          : `${request.topicTitle} 제안이 반려되었습니다. 검토 의견을 확인해 주세요.`,
        href: "/project-approvals",
        dedupeKey: `topic-approval:${request.id}:${status}`,
        createdAt: input.decidedAt,
      });
      return status;
    });
  }
}
