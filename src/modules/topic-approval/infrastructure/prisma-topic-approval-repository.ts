import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import type { TopicApprovalRepository, TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";
import { createApplicationResultNotification } from "@/modules/notification/infrastructure/notification-events";
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

  async decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "UNAVAILABLE"> {
    for (let attempt = 1; attempt <= DECISION_ATTEMPTS; attempt += 1) {
      try {
      return await this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; topicId: string; route: "PROFESSOR" | "ADMIN"; requestedProfessorId: string | null; studentTeamId: string | null; status: string }>>(Prisma.sql`
        SELECT "id", "topicId", "route", "requestedProfessorId", "studentTeamId", "status"
        FROM "topic_approval_request" WHERE "id" = ${input.requestId} FOR UPDATE
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
        // 제안 시점 capacity와 정확히 일치하도록 요구하면 대기 중 팀원이 바뀔 때
        // 승인이 영구 불가해진다. 현재 활성 팀원 수를 그대로 정원으로 사용한다.
        if (
          members.length === 0 ||
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
            capacity: members.length,
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

        // 확정된 학생들이 같은 학기에 낸 다른 PENDING 지원을 자동 거절한다.
        // (수락 경로 prisma-topic-application-acceptance.ts와 동일한 정리 — 없으면
        //  해당 지원이 영구 "검토 중"으로 남고 교수 수락 시 STUDENT_ALREADY_ASSIGNED 충돌.)
        const conflicting = await transaction.topicApplication.findMany({
          where: {
            status: "PENDING",
            studentId: { in: studentIds },
            topic: { academicCycleId: topic.academicCycleId },
          },
          select: { id: true, groupId: true },
        });
        const conflictingIds = conflicting.map(({ id }) => id);
        const conflictingGroupIds = conflicting.flatMap(({ groupId }) => (groupId ? [groupId] : []));
        const toReject = conflictingIds.length || conflictingGroupIds.length
          ? await transaction.topicApplication.findMany({
              where: {
                status: "PENDING",
                OR: [{ id: { in: conflictingIds } }, { groupId: { in: conflictingGroupIds } }],
              },
              select: { id: true, studentId: true, topic: { select: { title: true } } },
            })
          : [];
        if (toReject.length) {
          const rejectedIds = toReject.map(({ id }) => id);
          await transaction.topicApplication.updateMany({
            where: { id: { in: rejectedIds }, status: "PENDING" },
            data: { status: "REJECTED", decidedAt: input.decidedAt },
          });
          await transaction.recruitmentApplication.updateMany({
            where: { topicApplicationId: { in: rejectedIds }, status: "PENDING" },
            data: { status: "REJECTED", decidedAt: input.decidedAt },
          });
          for (const rejected of toReject) {
            await createApplicationResultNotification(transaction, {
              applicationId: rejected.id,
              recipientId: rejected.studentId,
              topicTitle: rejected.topic.title,
              outcome: "REJECTED",
              createdAt: input.decidedAt,
            });
          }
        }
        }
      }
      const status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      await transaction.topicApprovalRequest.update({ where: { id: request.id }, data: { status, reviewComment: input.reviewComment, decidedById: input.actorId, decidedAt: input.decidedAt } });
      return status;
      });
      } catch (error) {
        // 학생-학기 중복(academicCycleId+studentId)은 동시 승인 TOCTOU 경합 → UNAVAILABLE.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          isStudentCycleUniqueConflict(error)
        ) {
          return "UNAVAILABLE";
        }
        // 직렬화 충돌(P2034)은 수락 경로와 동일하게 재시도.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < DECISION_ATTEMPTS
        ) {
          continue;
        }
        throw error;
      }
    }
    return "UNAVAILABLE";
  }
}

const DECISION_ATTEMPTS = 3;

function isStudentCycleUniqueConflict(error: Prisma.PrismaClientKnownRequestError): boolean {
  const target = error.meta?.target;
  return (
    Array.isArray(target) &&
    target.includes("academicCycleId") &&
    target.includes("studentId")
  );
}
