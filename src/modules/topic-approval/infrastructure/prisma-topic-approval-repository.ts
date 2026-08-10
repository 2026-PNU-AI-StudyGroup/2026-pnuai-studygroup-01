import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import {
  createApplicationResultNotifications,
  createTopicApprovalNotification,
} from "@/modules/notification/infrastructure/notification-events";
import type { TopicApprovalRepository, TopicApprovalRequestDetail, TopicApprovalRequestPage, TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

const DECISION_ATTEMPTS = 3;

function visibleApprovalRequest(actor: CurrentUser): Prisma.TopicApprovalRequestWhereInput {
  if (actor.role === "STUDENT") {
    return {
      OR: [
        { requesterId: actor.id },
        { studentTeam: { leaderId: actor.id, deletedAt: null } },
      ],
    };
  }
  if (actor.role === "PROFESSOR") {
    return { route: "PROFESSOR", requestedProfessorId: actor.id };
  }
  return { route: "ADMIN" };
}

export class PrismaTopicApprovalRepository implements TopicApprovalRepository {
  constructor(private readonly client: PrismaClient) {}

  listProfessors() {
    return this.client.user.findMany({ where: { role: "PROFESSOR", isActive: true }, orderBy: [{ name: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true } });
  }

  create(input: TopicDraft & { route: "PROFESSOR" | "ADMIN"; requestedProfessorId: string | null; studentTeamId?: string; requestedAt: Date }): Promise<string | null> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{
        id: string;
        isPublic: boolean;
        lifecycleStatus: "ACTIVE" | "CLOSED";
        advisorEnabled: boolean;
        studentProjectCreationEnabled: boolean;
        projectRegistrationStartsAt: Date;
        projectRegistrationEndsAt: Date;
      }>>(Prisma.sql`
        SELECT "id", "isPublic", "lifecycleStatus", "advisorEnabled", "studentProjectCreationEnabled", "projectRegistrationStartsAt", "projectRegistrationEndsAt"
        FROM "project_program"
        WHERE "id" = ${input.programId}
        FOR SHARE
      `);
      const program = programs[0];
      if (
        !program ||
        !program.isPublic ||
        program.lifecycleStatus !== "ACTIVE" ||
        program.projectRegistrationStartsAt > input.requestedAt ||
        program.projectRegistrationEndsAt <= input.requestedAt ||
        !program.studentProjectCreationEnabled
      ) return null;
      if (!program.advisorEnabled && input.route !== "ADMIN") return null;
      const divisions = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "program_track" WHERE "programId" = ${input.programId} FOR SHARE
      `);
      if ((divisions.length > 0 && !input.divisionId) || (input.divisionId != null && !divisions.some(({ id }) => id === input.divisionId))) return null;
      if (input.route === "PROFESSOR") {
        const professor = await transaction.user.findFirst({ where: { id: input.requestedProfessorId!, role: "PROFESSOR", isActive: true }, select: { id: true } });
        if (!professor) return null;
      }
      const lockedStudentTeam = input.studentTeamId
        ? (await transaction.$queryRaw<Array<{ id: string; compositionVersion: number }>>(Prisma.sql`
          SELECT "id"
               , "compositionVersion"
          FROM "student_team"
          WHERE "id" = ${input.studentTeamId}
            AND "leaderId" = ${input.authorId}
            AND "deletedAt" IS NULL
          FOR UPDATE
        `))[0]
        : null;
      const studentTeam = lockedStudentTeam
        ? await transaction.studentTeam.findFirst({
          where: { id: input.studentTeamId, leaderId: input.authorId, deletedAt: null },
          select: {
            id: true,
            compositionVersion: true,
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
            programId: input.programId,
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
          status: "PENDING_APPROVAL",
          publishedAt: null,
          createdAt: requestedAt,
          updatedAt: requestedAt,
          applicationQuestions: { create: applicationQuestions.map((question, position) => ({ id: randomUUID(), ...question, position })) },
          approvalRequest: { create: { id: randomUUID(), requesterId: input.authorId, route, requestedProfessorId, studentTeamId: studentTeam ? studentTeamId : undefined, studentTeamVersion: studentTeam?.compositionVersion, status: "PENDING", createdAt: requestedAt, updatedAt: requestedAt } },
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

  async listVisiblePage(
    actor: CurrentUser,
    requestedPage: number,
    pageSize: number,
    status?: TopicApprovalRequestSummary["status"],
  ): Promise<TopicApprovalRequestPage> {
    const visibility = visibleApprovalRequest(actor);
    const where: Prisma.TopicApprovalRequestWhereInput = status
      ? { AND: [visibility, { status }] }
      : visibility;
    const safePageSize = Math.min(Math.max(pageSize, 1), 100);
    const total = await this.client.topicApprovalRequest.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const page = Math.min(Math.max(requestedPage, 1), totalPages);
    const requests = await this.client.topicApprovalRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * safePageSize,
      take: safePageSize,
      include: {
        topic: { select: { title: true } },
        requester: { select: { name: true } },
        requestedProfessor: { select: { name: true } },
      },
    });
    return {
      items: requests.map(({ topic, requester, requestedProfessor, ...request }) => ({
        ...request,
        topicTitle: topic.title,
        requesterName: requester.name,
        requestedProfessorName: requestedProfessor?.name ?? null,
      })),
      page,
      totalPages,
      total,
    };
  }

  async findVisible(actor: CurrentUser, requestId: string): Promise<TopicApprovalRequestDetail | null> {
    const request = await this.client.topicApprovalRequest.findFirst({
      where: { AND: [{ id: requestId }, visibleApprovalRequest(actor)] },
      include: {
        requester: { select: { name: true } },
        requestedProfessor: { select: { name: true } },
        studentTeam: {
          select: {
            name: true,
            members: {
              orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
              select: { studentId: true, role: true, student: { select: { name: true, email: true } } },
            },
          },
        },
        topic: {
          include: {
            program: { select: { name: true, category: true, recruitmentEndsAt: true } },
            applicationQuestions: {
              orderBy: { position: "asc" },
              select: { id: true, label: true, maxLength: true, required: true },
            },
          },
        },
      },
    });
    if (!request) return null;
    const { requester, requestedProfessor, studentTeam, topic, ...summary } = request;
    return {
      ...summary,
      topicTitle: topic.title,
      requesterName: requester.name,
      requestedProfessorName: requestedProfessor?.name ?? null,
      programName: topic.program.name,
      programCategory: topic.program.category,
      description: topic.description,
      requiredSkills: topic.requiredSkills,
      preferredSkills: topic.preferredSkills,
      roleExpectations: topic.roleExpectations,
      availabilityRequirement: topic.availabilityRequirement,
      applicationMode: topic.applicationMode,
      capacity: topic.capacity,
      recruitmentStartsAt: topic.recruitmentStartsAt,
      programRecruitmentEndsAt: topic.program.recruitmentEndsAt,
      executionStartsAt: topic.executionStartsAt,
      executionEndsAt: topic.executionEndsAt,
      submissionStartsAt: topic.submissionStartsAt,
      submissionEndsAt: topic.submissionEndsAt,
      applicationQuestions: topic.applicationQuestions,
      studentTeam: studentTeam ? {
        name: studentTeam.name,
        members: studentTeam.members.map(({ studentId, role, student }) => ({
          id: studentId,
          name: student.name,
          email: student.email,
          role,
        })),
      } : null,
    };
  }

  async decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; studentTeamVersion?: number; teamCompositionConfirmed?: boolean; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "TEAM_CHANGED" | "UNAVAILABLE"> {
    for (let attempt = 1; attempt <= DECISION_ATTEMPTS; attempt += 1) {
      try {
        return await this.client.$transaction(async (transaction) => {
        const initialRequest = await transaction.topicApprovalRequest.findUnique({
          where: { id: input.requestId },
          select: {
            id: true,
            topicId: true,
            requesterId: true,
            route: true,
            requestedProfessorId: true,
            studentTeamId: true,
            studentTeamVersion: true,
            status: true,
            topic: { select: { title: true } },
          },
        });
        if (!initialRequest || initialRequest.status !== "PENDING") return "UNAVAILABLE";
        if (!canDecideApprovalRequest(initialRequest, input)) return "FORBIDDEN";

        if (input.decision === "REJECT") {
          const request = await lockApprovalRequest(transaction, input.requestId);
          if (!isSamePendingApprovalRequest(initialRequest, request)) return "UNAVAILABLE";
          if (!canDecideApprovalRequest(request, input)) return "FORBIDDEN";
          await transaction.topicApprovalRequest.update({
            where: { id: request.id },
            data: { status: "REJECTED", reviewComment: input.reviewComment, decidedById: input.actorId, decidedAt: input.decidedAt },
          });
          await transaction.topic.updateMany({
            where: { id: request.topicId, status: "PENDING_APPROVAL" },
            data: { status: "REJECTED" },
          });
          await notifyTopicApprovalResult(transaction, initialRequest, "REJECTED", input.decidedAt);
          return "REJECTED";
        }

        const programs = await transaction.$queryRaw<Array<{
          lifecycleStatus: "ACTIVE" | "CLOSED";
          projectRegistrationStartsAt: Date;
          projectRegistrationEndsAt: Date;
          recruitmentEndsAt: Date;
        }>>(Prisma.sql`
          SELECT "project_program"."lifecycleStatus", "project_program"."projectRegistrationStartsAt", "project_program"."projectRegistrationEndsAt", "project_program"."recruitmentEndsAt"
          FROM "project_program"
          JOIN "topic" ON "topic"."programId" = "project_program"."id"
          WHERE "topic"."id" = ${initialRequest.topicId}
          FOR UPDATE OF "project_program"
        `);
        if (
          programs[0]?.lifecycleStatus !== "ACTIVE" ||
          programs[0].projectRegistrationStartsAt > input.decidedAt ||
          programs[0].projectRegistrationEndsAt <= input.decidedAt ||
          programs[0].recruitmentEndsAt <= input.decidedAt
        ) return "UNAVAILABLE";

        const topics = await transaction.$queryRaw<Array<LockedApprovalTopic>>(Prisma.sql`
          SELECT "id", "programId", "authorId", "title", "capacity", "recruitmentEnabled", "status"
          FROM "topic"
          WHERE "id" = ${initialRequest.topicId}
          FOR UPDATE
        `);
        const topic = topics[0];
        if (
          !topic ||
          topic.status !== "PENDING_APPROVAL"
        ) return "UNAVAILABLE";

        const studentTeam = topic.recruitmentEnabled
          ? null
          : await lockStudentTeam(transaction, initialRequest.studentTeamId);
        if (!topic.recruitmentEnabled && !studentTeam) return "UNAVAILABLE";

        const request = await lockApprovalRequest(transaction, input.requestId);
        if (!isSamePendingApprovalRequest(initialRequest, request)) return "UNAVAILABLE";
        if (!canDecideApprovalRequest(request, input)) return "FORBIDDEN";

        if (
          !topic.recruitmentEnabled && (
            !studentTeam ||
            request.studentTeamVersion == null ||
            input.studentTeamVersion !== request.studentTeamVersion ||
            !input.teamCompositionConfirmed ||
            studentTeam.compositionVersion !== request.studentTeamVersion
          )
        ) return "TEAM_CHANGED";

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
          if (!studentTeam) return "UNAVAILABLE";
          const members = await transaction.studentTeamMember.findMany({
            where: { teamId: studentTeam.id },
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
            select: { studentId: true, student: { select: { role: true, isActive: true } } },
          });
          if (
            members.length === 0 ||
            members.some(({ student }) => student.role !== "STUDENT" || !student.isActive)
          ) return "UNAVAILABLE";
          const studentIds = members.map(({ studentId }) => studentId);
          const alreadyAssigned = await transaction.teamMember.count({
            where: { programId: topic.programId, studentId: { in: studentIds } },
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
            decidedById: input.actorId,
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
              programId: topic.programId,
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
              programId: topic.programId,
              topicId: topic.id,
              studentId: application.studentId,
              applicationId: application.id,
              joinedAt: input.decidedAt,
            })),
          });
          await rejectOtherPendingApplications(
            transaction,
            topic.programId,
            studentIds,
            applications.map(({ id }) => id),
            input.actorId,
            input.decidedAt,
          );
        }
        await transaction.topicApprovalRequest.update({
          where: { id: request.id },
          data: { status: "APPROVED", reviewComment: input.reviewComment, decidedById: input.actorId, decidedAt: input.decidedAt },
        });
        await notifyTopicApprovalResult(transaction, initialRequest, "APPROVED", input.decidedAt);
        return "APPROVED";
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          isStudentProgramUniqueConflict(error)
        ) return "UNAVAILABLE";
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < DECISION_ATTEMPTS
        ) continue;
        throw error;
      }
    }
    return "UNAVAILABLE";
  }
}

type ApprovalRequestLockRow = {
  id: string;
  topicId: string;
  route: "PROFESSOR" | "ADMIN";
  requestedProfessorId: string | null;
  studentTeamId: string | null;
  studentTeamVersion: number | null;
  status: string;
};

type ApprovalNotificationContext = {
  id: string;
  requesterId: string;
  topic: { title: string };
};

function notifyTopicApprovalResult(
  transaction: Prisma.TransactionClient,
  request: ApprovalNotificationContext,
  status: "APPROVED" | "REJECTED",
  createdAt: Date,
) {
  return createTopicApprovalNotification(transaction, {
    recipientId: request.requesterId,
    title: status === "APPROVED" ? "프로젝트 제안이 승인되었습니다" : "프로젝트 제안이 반려되었습니다",
    body: status === "APPROVED"
      ? `${request.topic.title} 제안이 승인되어 공개되었습니다.`
      : `${request.topic.title} 제안이 반려되었습니다. 검토 의견을 확인해 주세요.`,
    href: "/project-approvals",
    dedupeKey: `topic-approval:${request.id}:${status}`,
    createdAt,
  });
}

type LockedApprovalTopic = {
  id: string;
  programId: string;
  authorId: string;
  title: string;
  capacity: number;
  recruitmentEnabled: boolean;
  status: "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "CLOSED";
};

function lockApprovalRequest(
  transaction: Prisma.TransactionClient,
  requestId: string,
): Promise<ApprovalRequestLockRow | undefined> {
  return transaction.$queryRaw<ApprovalRequestLockRow[]>(Prisma.sql`
    SELECT "id", "topicId", "route", "requestedProfessorId", "studentTeamId", "studentTeamVersion", "status"
    FROM "topic_approval_request"
    WHERE "id" = ${requestId}
    FOR UPDATE
  `).then((rows) => rows[0]);
}

function lockStudentTeam(
  transaction: Prisma.TransactionClient,
  studentTeamId: string | null,
): Promise<{ id: string; leaderId: string; name: string; compositionVersion: number } | undefined> {
  if (!studentTeamId) return Promise.resolve(undefined);
  return transaction.$queryRaw<Array<{ id: string; leaderId: string; name: string; compositionVersion: number }>>(Prisma.sql`
    SELECT "id", "leaderId", "name", "compositionVersion"
    FROM "student_team"
    WHERE "id" = ${studentTeamId} AND "deletedAt" IS NULL
    FOR UPDATE
  `).then((rows) => rows[0]);
}

function canDecideApprovalRequest(
  request: Pick<ApprovalRequestLockRow, "route" | "requestedProfessorId">,
  input: { actorId: string; actorRole: "PROFESSOR" | "ADMIN" },
): boolean {
  return request.route === "PROFESSOR"
    ? input.actorRole === "PROFESSOR" && request.requestedProfessorId === input.actorId
    : input.actorRole === "ADMIN";
}

function isSamePendingApprovalRequest(
  initial: ApprovalRequestLockRow,
  locked: ApprovalRequestLockRow | undefined,
): locked is ApprovalRequestLockRow {
  return Boolean(
    locked &&
    locked.status === "PENDING" &&
    locked.id === initial.id &&
    locked.topicId === initial.topicId &&
    locked.route === initial.route &&
    locked.requestedProfessorId === initial.requestedProfessorId &&
    locked.studentTeamId === initial.studentTeamId
      && locked.studentTeamVersion === initial.studentTeamVersion
  );
}

function isStudentProgramUniqueConflict(
  error: Prisma.PrismaClientKnownRequestError,
): boolean {
  const target = error.meta?.target;
  return (
    Array.isArray(target) &&
    target.includes("programId") &&
    target.includes("studentId")
  );
}

async function rejectOtherPendingApplications(
  transaction: Prisma.TransactionClient,
  programId: string,
  studentIds: string[],
  acceptedApplicationIds: string[],
  decidedById: string,
  decidedAt: Date,
): Promise<void> {
  const directConflicts = await transaction.topicApplication.findMany({
    where: {
      id: { notIn: acceptedApplicationIds },
      studentId: { in: studentIds },
      status: "PENDING",
      topic: { programId },
    },
    select: { id: true, groupId: true },
  });
  if (!directConflicts.length) return;

  const conflictIds = directConflicts.map(({ id }) => id);
  const conflictGroupIds = directConflicts.flatMap(({ groupId }) => groupId ? [groupId] : []);
  const rejected = await transaction.topicApplication.findMany({
    where: {
      status: "PENDING",
      OR: [
        { id: { in: conflictIds } },
        { groupId: { in: conflictGroupIds } },
      ],
    },
    select: {
      id: true,
      studentId: true,
      topic: { select: { title: true } },
    },
  });
  if (!rejected.length) return;

  const rejectedIds = rejected.map(({ id }) => id);
  await transaction.topicApplication.updateMany({
    where: { id: { in: rejectedIds }, status: "PENDING" },
    data: {
      status: "REJECTED",
      decidedAt,
      decidedById,
      reviewComment: "같은 프로그램의 다른 프로젝트 참여가 확정되어 자동 미선정되었습니다.",
    },
  });
  await transaction.recruitmentApplication.updateMany({
    where: { topicApplicationId: { in: rejectedIds }, status: "PENDING" },
    data: { status: "REJECTED", decidedAt },
  });
  await createApplicationResultNotifications(
    transaction,
    rejected.map((application) => ({
      applicationId: application.id,
      recipientId: application.studentId,
      topicTitle: application.topic.title,
      outcome: "REJECTED",
      createdAt: decidedAt,
    })),
  );
}
