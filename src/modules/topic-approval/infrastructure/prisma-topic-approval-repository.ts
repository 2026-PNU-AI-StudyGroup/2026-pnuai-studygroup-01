import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { assignProgramDeliverablesToTeam } from "@/modules/report/infrastructure/program-deliverable-assignment";
import type { TopicApprovalViewer } from "@/modules/topic-approval/application/manage-topic-approvals";
import { projectApprovalsHref } from "@/modules/topic-approval/ui/project-approval-route";
import { createTopicApprovalNotification } from "@/modules/notification/infrastructure/notification-events";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";
import type { PendingApprovalCountByProgram, TopicApprovalListFilter, TopicApprovalRepository, TopicApprovalRequestPage } from "@/modules/topic-approval/application/manage-topic-approvals";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

const DECISION_ATTEMPTS = 3;

function visibleApprovalRequest(actor: TopicApprovalViewer): Prisma.TopicApprovalRequestWhereInput {
  if (actor.role === "STUDENT") {
    return { requesterId: actor.id };
  }
  if (actor.role === "PROFESSOR") {
    return { route: "PROFESSOR", requestedProfessorId: actor.id };
  }
  return { route: "ADMIN" };
}

export class PrismaTopicApprovalRepository implements TopicApprovalRepository {
  constructor(private readonly client: PrismaClient) {}

  listProfessors() {
    return this.client.user.findMany({ where: { role: "PROFESSOR", accountStatus: "ACTIVE" }, orderBy: [{ name: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true } });
  }

  create(input: TopicDraft & {
    route: "PROFESSOR" | "ADMIN";
    requestedProfessorId: string | null;
    sourceStudentTeamId: string;
    projectRepresentativeId: string;
    projectTeamName: string;
    requestedAt: Date;
  }): Promise<string | null> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{
        id: string;
        isPublic: boolean;
        advisorEnabled: boolean;
        studentProjectCreationEnabled: boolean;
        projectTeamMinSize: number;
        projectTeamMaxSize: number;
        projectRegistrationStartsAt: Date;
        projectRegistrationEndsAt: Date;
        endsAt: Date;
      }>>(Prisma.sql`
        SELECT "id", "isPublic", "endsAt", "advisorEnabled", "studentProjectCreationEnabled", "projectTeamMinSize", "projectTeamMaxSize", "projectRegistrationStartsAt", "projectRegistrationEndsAt"
        FROM "project_program"
        WHERE "id" = ${input.programId}
        FOR SHARE
      `);
      const program = programs[0];
      if (
        !program ||
        !program.isPublic ||
        program.endsAt <= input.requestedAt ||
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
        const professor = await transaction.user.findFirst({ where: { id: input.requestedProfessorId!, role: "PROFESSOR", accountStatus: "ACTIVE" }, select: { id: true } });
        if (!professor) return null;
      }
      const lockedStudentTeam = (await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "student_team"
          WHERE "id" = ${input.sourceStudentTeamId}
            AND "leaderId" = ${input.authorId}
            AND "deletedAt" IS NULL
          FOR UPDATE
        `))[0];
      const studentTeam = lockedStudentTeam
        ? await transaction.studentTeam.findFirst({
          where: { id: input.sourceStudentTeamId, leaderId: input.authorId, deletedAt: null },
          select: {
            id: true,
            members: { select: { studentId: true, student: { select: { role: true, accountStatus: true } } } },
          },
        })
        : null;
      if (
        !studentTeam ||
        studentTeam.members.length < program.projectTeamMinSize ||
        studentTeam.members.length > program.projectTeamMaxSize ||
        studentTeam.members.some(({ student }) => student.role !== "STUDENT" || student.accountStatus !== "ACTIVE") ||
        !studentTeam.members.some(({ studentId }) => studentId === input.projectRepresentativeId)
      ) return null;
      const { applicationQuestions, route, requestedProfessorId, sourceStudentTeamId, projectRepresentativeId, projectTeamName, requestedAt, ...topic } = input;
      if (studentTeam.id !== sourceStudentTeamId) return null;
      const id = randomUUID();
      const approvalRequestId = randomUUID();
      await transaction.topic.create({
        data: {
          id,
          ...topic,
          managerId: null,
          applicationMode: "TEAM_ONLY",
          recruitmentEnabled: false,
          capacity: studentTeam.members.length,
          status: "PENDING_APPROVAL",
          publishedAt: null,
          createdAt: requestedAt,
          updatedAt: requestedAt,
          applicationQuestions: { create: applicationQuestions.map((question, position) => ({ id: randomUUID(), ...question, position })) },
          approvalRequests: { create: { id: approvalRequestId, requesterId: input.authorId, route, requestedProfessorId, status: "PENDING", createdAt: requestedAt, updatedAt: requestedAt } },
          projectTeam: { create: {
            name: projectTeamName,
            createdAt: requestedAt,
            updatedAt: requestedAt,
            memberships: { create: studentTeam.members.map(({ studentId }) => ({
              userId: studentId,
              role: studentId === projectRepresentativeId ? "LEADER" as const : "MEMBER" as const,
              joinedAt: requestedAt,
            })) },
          } },
        },
      });
      // 프로젝트 팀은 등록 시점의 명단으로 굳는다. 아직 응답이 없는 초대를 살려 두면
      // 뒤늦게 수락한 사람이 학생 팀에만 들어가 명단이 어긋난다.
      await transaction.studentTeamInvitation.updateMany({
        where: { teamId: sourceStudentTeamId, status: "PENDING" },
        data: { status: "CANCELED" },
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
      const reviewerIds = route === "PROFESSOR"
        ? [requestedProfessorId!]
        : (await transaction.user.findMany({
          where: { role: "ADMIN", accountStatus: "ACTIVE" },
          select: { id: true },
        })).map(({ id: userId }) => userId);
      const reviewerHref = route === "ADMIN"
        ? projectApprovalsHref({ programId: topic.programId, status: "PENDING" })
        : "/dashboard?view=pending";
      const notifications = [
        ...reviewerIds.map((recipientId) => ({
          recipientId,
          title: "프로젝트 등록 승인 요청이 도착했습니다",
          body: `${topic.title} 프로젝트 등록을 검토해 주세요.`,
          titleEn: "Project registration approval requested",
          bodyEn: `Review the registration for ${topic.title} in PMS.`,
          href: reviewerHref,
          key: `topic-approval-request:${approvalRequestId}:${recipientId}`,
        })),
        {
          recipientId: input.authorId,
          title: "프로젝트 등록 승인 요청이 접수되었습니다",
          body: `${topic.title} 프로젝트 등록이 접수되었습니다. 검토 결과는 PMS에서 안내합니다.`,
          titleEn: "Project registration approval request received",
          bodyEn: `Your registration for ${topic.title} was received. PMS will provide the review result.`,
          href: "/dashboard?view=pending",
          key: `topic-approval-request-receipt:${approvalRequestId}:${input.authorId}`,
        },
      ];
      await transaction.notification.createMany({
        data: notifications.map(({ recipientId, title, body, href, key }) => ({
          recipientId,
          type: "TOPIC_APPROVAL" as const,
          title,
          body,
          href,
          dedupeKey: key,
          createdAt: requestedAt,
        })),
        skipDuplicates: true,
      });
      await enqueueEmailEvents(transaction, notifications.map(({ recipientId, title, body, titleEn, bodyEn, href, key }) => ({
        kind: "TOPIC_APPROVAL" as const,
        recipientId,
        title,
        body,
        titleEn,
        bodyEn,
        href,
        idempotencyKey: `email:${key}`,
        createdAt: requestedAt,
      })));
      return id;
    });
  }

  async listVisiblePage(
    actor: TopicApprovalViewer,
    requestedPage: number,
    pageSize: number,
    filter: TopicApprovalListFilter = {},
  ): Promise<TopicApprovalRequestPage> {
    const visibility = visibleApprovalRequest(actor);
    const conditions: Prisma.TopicApprovalRequestWhereInput[] = [visibility];
    if (filter.status) conditions.push({ status: filter.status });
    if (filter.programId) conditions.push({ topic: { programId: filter.programId } });
    if (filter.programEndsAfter) conditions.push({ topic: { program: { endsAt: { gt: filter.programEndsAfter } } } });
    const where: Prisma.TopicApprovalRequestWhereInput = conditions.length === 1
      ? visibility
      : { AND: conditions };
    const safePageSize = Math.min(Math.max(pageSize, 1), 100);
    const total = await this.client.topicApprovalRequest.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const page = Math.min(Math.max(requestedPage, 1), totalPages);
    const requests = await this.client.topicApprovalRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * safePageSize,
      take: safePageSize,
      include: {
        topic: { select: {
          title: true,
          description: true,
          programId: true,
          program: { select: { name: true, category: true } },
          projectTeam: {
            select: {
              id: true,
              name: true,
              confirmedAt: true,
              createdAt: true,
              memberships: {
                where: { endedAt: null },
                orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
                select: { userId: true, role: true, user: { select: { name: true } } },
              },
            },
          },
        } },
        requester: { select: { name: true } },
        requestedProfessor: { select: { name: true } },
      },
    });
    const contactsByUserId = new Map<string, {
      email: string;
      contactEmail: string | null;
      phone: string | null;
      kakao: string | null;
      github: string | null;
      instagram: string | null;
    }>();
    if (actor.role === "ADMIN") {
      const memberIds = [...new Set(requests.flatMap(({ topic }) => topic.projectTeam?.memberships.map(({ userId }) => userId) ?? []))];
      if (memberIds.length) {
        const members = await this.client.user.findMany({
          where: { id: { in: memberIds } },
          select: {
            id: true,
            email: true,
            contactEmail: true,
            phoneNumber: true,
            studentProfile: { select: { phone: true, kakao: true, github: true, instagram: true } },
          },
        });
        for (const member of members) {
          contactsByUserId.set(member.id, {
            email: member.email,
            contactEmail: member.contactEmail,
            phone: member.studentProfile?.phone || member.phoneNumber,
            kakao: member.studentProfile?.kakao ?? null,
            github: member.studentProfile?.github ?? null,
            instagram: member.studentProfile?.instagram ?? null,
          });
        }
      }
    }
    return {
      items: requests.map(({ topic, requester, requestedProfessor, ...request }) => ({
        ...request,
        topicTitle: topic.title,
        programId: topic.programId,
        programName: topic.program.name,
        programCategory: topic.program.category,
        requesterName: requester.name,
        requestedProfessorName: requestedProfessor?.name ?? null,
        description: topic.description,
        projectTeam: topic.projectTeam ? {
          id: topic.projectTeam.id,
          name: topic.projectTeam.name,
          confirmedAt: topic.projectTeam.confirmedAt,
          createdAt: topic.projectTeam.createdAt,
          members: topic.projectTeam.memberships.map(({ userId, role, user }) => ({
            id: userId,
            name: user.name,
            role,
            contact: contactsByUserId.get(userId) ?? null,
          })),
        } : null,
      })),
      page,
      totalPages,
      total,
    };
  }

  async listAdminPendingCountsByProgram(): Promise<PendingApprovalCountByProgram[]> {
    const rows = await this.client.$queryRaw<Array<{ programId: string; count: number }>>(Prisma.sql`
      SELECT topic."programId" AS "programId", COUNT(*)::integer AS "count"
      FROM "topic_approval_request" AS request
      INNER JOIN "topic" AS topic ON topic."id" = request."topicId"
      WHERE request."status" = 'PENDING'
        AND request."route" = 'ADMIN'
      GROUP BY topic."programId"
    `);
    return rows.map(({ programId, count }) => ({ programId, count: Number(count) }));
  }

  async decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "UNAVAILABLE"> {
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
          await transaction.projectTeam.deleteMany({ where: { projectId: request.topicId, confirmedAt: null } });
          await notifyTopicApprovalResult(transaction, initialRequest, "REJECTED", input.decidedAt);
          return "REJECTED";
        }

        const programs = await transaction.$queryRaw<Array<{
          projectRegistrationStartsAt: Date;
          projectRegistrationEndsAt: Date;
          endsAt: Date;
          studentProjectCreationEnabled: boolean;
        }>>(Prisma.sql`
          SELECT "project_program"."endsAt", "project_program"."projectRegistrationStartsAt", "project_program"."projectRegistrationEndsAt", "project_program"."studentProjectCreationEnabled"
          FROM "project_program"
          JOIN "topic" ON "topic"."programId" = "project_program"."id"
          WHERE "topic"."id" = ${initialRequest.topicId}
          FOR UPDATE OF "project_program"
        `);
        if (
          !programs[0] || programs[0].endsAt <= input.decidedAt ||
          !programs[0].studentProjectCreationEnabled ||
          programs[0].projectRegistrationStartsAt > input.decidedAt ||
          programs[0].projectRegistrationEndsAt <= input.decidedAt
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
        const request = await lockApprovalRequest(transaction, input.requestId);
        if (!isSamePendingApprovalRequest(initialRequest, request)) return "UNAVAILABLE";
        if (!canDecideApprovalRequest(request, input)) return "FORBIDDEN";
        const projectTeam = await transaction.projectTeam.findUnique({
          where: { projectId: topic.id },
          select: {
            id: true,
            confirmedAt: true,
            memberships: {
              where: { endedAt: null },
              orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
              select: { id: true, userId: true, role: true, user: { select: { role: true, accountStatus: true } } },
            },
          },
        });
        if (
          !projectTeam ||
          projectTeam.confirmedAt ||
          projectTeam.memberships.length !== topic.capacity ||
          projectTeam.memberships.length === 0 ||
          projectTeam.memberships.filter(({ role }) => role === "LEADER").length !== 1 ||
          projectTeam.memberships.some(({ user }) => user.role !== "STUDENT" || user.accountStatus !== "ACTIVE")
        ) return "UNAVAILABLE";

        const leaderId = projectTeam.memberships.find(({ role }) => role === "LEADER")!.userId;
        const groupId = randomUUID();
        await transaction.topicApplicationGroup.create({
          data: {
            id: groupId,
            topicId: topic.id,
            leaderId,
            kind: "TEAM",
            createdAt: input.decidedAt,
          },
        });
        const applications = projectTeam.memberships.map(({ userId, role }) => ({
            id: randomUUID(),
            topicId: topic.id,
            studentId: userId,
            groupId,
            participantRole: role,
            message: "학생 등록 프로젝트 기존 팀 참여",
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
        await Promise.all(applications.map((application) => transaction.projectTeamMembership.update({
          where: { id: projectTeam.memberships.find(({ userId }) => userId === application.studentId)!.id },
          data: { sourceApplicationId: application.id },
        })));
        await transaction.topic.update({
          where: { id: topic.id },
          data: { managerId: input.actorId, status: "ACTIVE", publishedAt: input.decidedAt },
        });
        await transaction.projectTeam.update({
          where: { id: projectTeam.id },
          data: { confirmedAt: input.decidedAt, updatedAt: input.decidedAt },
        });
        await assignProgramDeliverablesToTeam(transaction, projectTeam.id, input.decidedAt);
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
          error.code === "P2034" &&
          attempt < DECISION_ATTEMPTS
        ) continue;
        throw error;
      }
    }
    return "UNAVAILABLE";
  }

  withdraw(input: { projectId: string; requesterId: string; withdrawnAt: Date }): Promise<"WITHDRAWN" | "NOT_FOUND" | "FORBIDDEN"> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ requestId: string; requesterId: string }>>(Prisma.sql`
        SELECT request."id" AS "requestId", request."requesterId" AS "requesterId"
        FROM "topic_approval_request" AS request
        INNER JOIN "topic" ON "topic"."id" = request."topicId"
        INNER JOIN "project_team" ON "project_team"."projectId" = "topic"."id"
        WHERE request."topicId" = ${input.projectId}
          AND request."status" = 'PENDING'
          AND "topic"."status" = 'PENDING_APPROVAL'
          AND "project_team"."confirmedAt" IS NULL
        FOR UPDATE OF request, "topic", "project_team"
      `);
      const request = rows[0];
      if (!request) return "NOT_FOUND";
      if (request.requesterId !== input.requesterId) return "FORBIDDEN";

      await transaction.topicApprovalRequest.update({
        where: { id: request.requestId },
        data: {
          status: "WITHDRAWN",
          reviewComment: "등록자가 승인 요청을 철회했습니다.",
          decidedAt: input.withdrawnAt,
        },
      });
      await transaction.topic.update({
        where: { id: input.projectId },
        data: { status: "REJECTED", updatedAt: input.withdrawnAt },
      });
      await transaction.projectTeam.deleteMany({
        where: { projectId: input.projectId, confirmedAt: null },
      });
      return "WITHDRAWN";
    });
  }
}

type ApprovalRequestLockRow = {
  id: string;
  topicId: string;
  route: "PROFESSOR" | "ADMIN";
  requestedProfessorId: string | null;
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
    title: status === "APPROVED" ? "프로젝트 등록이 승인되었습니다" : "프로젝트 등록이 반려되었습니다",
    body: status === "APPROVED"
      ? `${request.topic.title} 등록이 승인되어 공개되었습니다.`
      : `${request.topic.title} 등록이 반려되었습니다. 검토 의견을 확인해 주세요.`,
    titleEn: status === "APPROVED" ? "Project registration approved" : "Project registration rejected",
    bodyEn: status === "APPROVED"
      ? `The registration for ${request.topic.title} was approved and is now visible.`
      : `The registration for ${request.topic.title} was rejected. Review the feedback in PMS.`,
    href: "/dashboard",
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
  status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE";
};

function lockApprovalRequest(
  transaction: Prisma.TransactionClient,
  requestId: string,
): Promise<ApprovalRequestLockRow | undefined> {
  return transaction.$queryRaw<ApprovalRequestLockRow[]>(Prisma.sql`
    SELECT "id", "topicId", "route", "requestedProfessorId", "status"
    FROM "topic_approval_request"
    WHERE "id" = ${requestId}
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
    locked.requestedProfessorId === initial.requestedProfessorId
  );
}
