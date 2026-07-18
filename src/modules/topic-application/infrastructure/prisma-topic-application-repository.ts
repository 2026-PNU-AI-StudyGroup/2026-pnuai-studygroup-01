import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotification } from "@/modules/notification/infrastructure/notification-events";
import type {
  CreateTopicApplicationInput,
  CreateTopicApplicationResult,
  TopicApplicationCreator,
  TeamApplicationInvitationRepository,
  TopicApplicationDecisionRepository,
  TopicApplicationLister,
  TopicApplicationSummary,
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationReader,
  ProfessorTopicApplicationSummary,
  ProfessorTopicApplicationViewer,
  TopicApplicationDecisionState,
  TopicApplicationDecisionActor,
  AcceptTopicApplicationOutcome,
  RejectTopicApplicationOutcome,
  TopicApplicationConfiguration,
  TeamApplicationInvitationSummary,
  TeamApplicationDraftSummary,
} from "@/modules/topic-application/application/topic-application-ports";

const studentSummarySelect = {
  id: true,
  topicId: true,
  studentId: true,
  status: true,
  message: true,
  skills: true,
  desiredRole: true,
  availability: true,
  createdAt: true,
  decidedAt: true,
  topic: { select: { title: true, status: true, program: { select: { name: true, status: true } } } },
  student: { select: { name: true, email: true } },
  group: { select: {
    kind: true,
    applications: { orderBy: { participantRole: "asc" as const }, select: { studentId: true, participantRole: true, student: { select: { name: true, email: true } } } },
    answers: { orderBy: { question: { position: "asc" as const } }, select: { questionId: true, value: true, question: { select: { label: true, required: true, maxLength: true } } } },
  } },
} satisfies Prisma.TopicApplicationSelect;

type StudentSummaryRow = Prisma.TopicApplicationGetPayload<{ select: typeof studentSummarySelect }>;

const professorSummarySelect = {
  id: true,
  topicId: true,
  studentId: true,
  status: true,
  message: true,
  skills: true,
  desiredRole: true,
  availability: true,
  createdAt: true,
  topic: { select: { title: true, authorId: true } },
  student: { select: { name: true, email: true } },
  group: { select: {
    kind: true,
    applications: { orderBy: { participantRole: "asc" as const }, select: { studentId: true, participantRole: true, student: { select: { name: true, email: true } } } },
    answers: { orderBy: { question: { position: "asc" as const } }, select: { questionId: true, value: true, question: { select: { label: true, required: true, maxLength: true } } } },
  } },
} satisfies Prisma.TopicApplicationSelect;

type ProfessorSummaryRow = Prisma.TopicApplicationGetPayload<{ select: typeof professorSummarySelect }>;

function toStudentSummary(application: StudentSummaryRow): TopicApplicationSummary {
  const { topic, student, group, ...record } = application;
  return { ...record, topicTitle: topic.title, topicStatus: topic.status, programName: topic.program.name, programStatus: topic.program.status, applicationKind: group?.kind ?? "INDIVIDUAL", teamMembers: group ? group.applications.map(({ studentId, participantRole, student: member }) => ({ studentId, name: member.name, email: member.email, role: participantRole })) : [{ studentId: application.studentId, name: student.name, email: student.email, role: "LEADER" }], answers: group?.answers.map(({ question, ...answer }) => ({ ...answer, ...question })) ?? [] };
}

function toProfessorSummary(application: ProfessorSummaryRow): ProfessorTopicApplicationSummary {
  const { topic, student, group, ...record } = application;
  return {
    ...record,
    topicTitle: topic.title,
    topicAuthorId: topic.authorId,
    studentName: student.name,
    studentEmail: student.email,
    applicationKind: group?.kind ?? "INDIVIDUAL",
    teamMembers: group ? group.applications.map(({ studentId, participantRole, student: member }) => ({ studentId, name: member.name, email: member.email, role: participantRole })) : [{ studentId: application.studentId, name: student.name, email: student.email, role: "LEADER" }],
    answers: group?.answers.map(({ question, ...answer }) => ({ ...answer, ...question })) ?? [],
  };
}

export class PrismaTopicApplicationRepository
  implements
    TopicApplicationCreator,
    TopicApplicationLister,
    ProfessorTopicApplicationLister,
    ProfessorTopicApplicationReader,
    TopicApplicationDecisionRepository,
    TeamApplicationInvitationRepository
{
  constructor(private readonly client: PrismaClient) {}

  async findConfiguration(topicId: string, appliedAt: Date): Promise<TopicApplicationConfiguration | null> {
    const topic = await this.client.topic.findFirst({
      where: { id: topicId, status: "PUBLISHED", recruitmentStartsAt: { lte: appliedAt }, recruitmentEndsAt: { gt: appliedAt }, program: { status: "OPEN" } },
      select: { id: true, applicationMode: true, capacity: true, applicationQuestions: { orderBy: { position: "asc" }, select: { id: true, label: true, maxLength: true, required: true } } },
    });
    return topic ? { topicId: topic.id, mode: topic.applicationMode, capacity: topic.capacity, questions: topic.applicationQuestions } : null;
  }

  async createIndividualIfAvailable(
    input: CreateTopicApplicationInput & { kind: "INDIVIDUAL"; inviteeEmails: [] },
  ): Promise<CreateTopicApplicationResult> {
    const id = randomUUID();
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${input.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<
        Array<{ id: string; academicCycleId: string; capacity: number; applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM" }>
      >(Prisma.sql`
        SELECT "topic"."id", "topic"."academicCycleId", "topic"."capacity", "topic"."applicationMode"
        FROM "topic"
        WHERE "topic"."id" = ${input.topicId}
          AND "topic"."status" = 'PUBLISHED'
          AND "topic"."recruitmentStartsAt" <= ${input.appliedAt}
          AND "topic"."recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE
      `);
      const topic = topics[0];
      if (programs[0]?.status !== "OPEN" || !topic) {
        return { outcome: "TOPIC_UNAVAILABLE" } as const;
      }
      if (topic.applicationMode === "TEAM_ONLY") return { outcome: "TOPIC_UNAVAILABLE" } as const;

      const teams = await transaction.$queryRaw<Array<{ status: "FORMING" | "CONFIRMED" | "CLOSED" }>>(Prisma.sql`
        SELECT "status" FROM "team" WHERE "topicId" = ${input.topicId} FOR UPDATE
      `);
      if (teams[0] && teams[0].status !== "FORMING") return { outcome: "TOPIC_UNAVAILABLE" } as const;
      const students = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
        SELECT "id", "role", "isActive" FROM "user" WHERE "id" = ${input.studentId} FOR UPDATE
      `);
      if (!areActiveStudents(students, 1)) return { outcome: "TOPIC_UNAVAILABLE" } as const;

      const membership = await transaction.teamMember.findUnique({
        where: {
          academicCycleId_studentId: {
            academicCycleId: topic.academicCycleId,
            studentId: input.studentId,
          },
        },
        select: { id: true },
      });
      if (membership) {
        return { outcome: "STUDENT_ALREADY_ASSIGNED" } as const;
      }

      const team = await transaction.team.findUnique({
        where: { topicId: input.topicId },
        select: { _count: { select: { members: true } } },
      });
      if ((team?._count.members ?? 0) >= topic.capacity) {
        return { outcome: "TOPIC_UNAVAILABLE" } as const;
      }

      const existing = await transaction.topicApplication.findUnique({
        where: {
          topicId_studentId: {
            topicId: input.topicId,
            studentId: input.studentId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return { outcome: "ALREADY_APPLIED" } as const;
      }

      const questionCount = await transaction.topicApplicationQuestion.count({ where: { topicId: input.topicId, id: { in: input.answers.map(({ questionId }) => questionId) } } });
      if (questionCount !== input.answers.length) return { outcome: "TOPIC_UNAVAILABLE" } as const;
      const group = await transaction.topicApplicationGroup.create({
        data: { topicId: input.topicId, leaderId: input.studentId, kind: "INDIVIDUAL", createdAt: input.appliedAt },
        select: { id: true },
      });
      await transaction.topicApplicationAnswer.createMany({ data: input.answers.map((answer) => ({ groupId: group.id, ...answer })) });
      await transaction.topicApplication.create({
        data: {
          id,
          topicId: input.topicId,
          studentId: input.studentId,
          groupId: group.id,
          participantRole: "LEADER",
          message: "교수 정의 지원서",
          skills: ["교수 정의 지원서"],
          desiredRole: "교수 정의 지원서",
          availability: "교수 정의 지원서",
          status: "PENDING",
          decidedAt: null,
          createdAt: input.appliedAt,
          updatedAt: input.appliedAt,
        },
      });
      return { outcome: "CREATED", id } as const;
    });
  }

  async createTeamDraftIfAvailable(
    input: CreateTopicApplicationInput & { kind: "TEAM" },
  ): Promise<CreateTopicApplicationResult> {
    const draftId = randomUUID();
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${input.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{ id: string; academicCycleId: string; capacity: number; applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM" }>>(Prisma.sql`
        SELECT "topic"."id", "topic"."academicCycleId", "topic"."capacity", "topic"."applicationMode"
        FROM "topic"
        WHERE "topic"."id" = ${input.topicId}
          AND "topic"."status" = 'PUBLISHED'
          AND "topic"."recruitmentStartsAt" <= ${input.appliedAt}
          AND "topic"."recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE
      `);
      const topic = topics[0];
      if (programs[0]?.status !== "OPEN" || !topic || topic.applicationMode === "INDIVIDUAL_ONLY" || input.inviteeEmails.length === 0 || input.inviteeEmails.length + 1 > topic.capacity) return { outcome: "TOPIC_UNAVAILABLE" } as const;
      const teams = await transaction.$queryRaw<Array<{ status: "FORMING" | "CONFIRMED" | "CLOSED" }>>(Prisma.sql`
        SELECT "status" FROM "team" WHERE "topicId" = ${input.topicId} FOR UPDATE
      `);
      if (teams[0] && teams[0].status !== "FORMING") return { outcome: "TOPIC_UNAVAILABLE" } as const;
      const leaders = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
        SELECT "id", "role", "isActive" FROM "user" WHERE "id" = ${input.studentId} FOR UPDATE
      `);
      if (!areActiveStudents(leaders, 1)) return { outcome: "TOPIC_UNAVAILABLE" } as const;
      const membership = await transaction.teamMember.findUnique({ where: { academicCycleId_studentId: { academicCycleId: topic.academicCycleId, studentId: input.studentId } }, select: { id: true } });
      const existing = await transaction.topicApplication.findUnique({ where: { topicId_studentId: { topicId: input.topicId, studentId: input.studentId } }, select: { id: true } });
      const existingDraft = await transaction.teamApplicationDraft.findUnique({ where: { topicId_leaderId: { topicId: input.topicId, leaderId: input.studentId } }, select: { id: true } });
      const team = await transaction.team.findUnique({ where: { topicId: input.topicId }, select: { _count: { select: { members: true } } } });
      const questionCount = await transaction.topicApplicationQuestion.count({ where: { topicId: input.topicId, id: { in: input.answers.map(({ questionId }) => questionId) } } });
      if (membership) return { outcome: "STUDENT_ALREADY_ASSIGNED" } as const;
      if (existing || existingDraft) return { outcome: "ALREADY_APPLIED" } as const;
      if ((team?._count.members ?? 0) + input.inviteeEmails.length + 1 > topic.capacity || questionCount !== input.answers.length) return { outcome: "TOPIC_UNAVAILABLE" } as const;

      const registeredInvitees = await transaction.user.findMany({
        where: { email: { in: input.inviteeEmails, mode: "insensitive" } },
        select: { id: true, role: true, isActive: true },
      });
      if (registeredInvitees.length) {
        if (!areActiveStudents(registeredInvitees, registeredInvitees.length)) return { outcome: "TEAM_MEMBER_UNAVAILABLE" } as const;
        const unavailableCount = await transaction.user.count({ where: { id: { in: registeredInvitees.map(({ id }) => id) }, OR: [
          { teamMemberships: { some: { academicCycleId: topic.academicCycleId } } },
          { topicApplications: { some: { topicId: input.topicId } } },
        ] } });
        if (unavailableCount > 0) return { outcome: "TEAM_MEMBER_UNAVAILABLE" } as const;
      }

      await transaction.teamApplicationDraft.create({
        data: {
          id: draftId,
          topicId: input.topicId,
          leaderId: input.studentId,
          createdAt: input.appliedAt,
          updatedAt: input.appliedAt,
        },
      });
      await transaction.teamApplicationDraftAnswer.createMany({ data: input.answers.map((answer) => ({ draftId, ...answer })) });
      await transaction.teamApplicationInvitation.createMany({ data: input.inviteeEmails.map((email) => ({ draftId, email, createdAt: input.appliedAt })) });
      return { outcome: "INVITATIONS_PENDING", draftId } as const;
    });
  }

  async listForInvitee(email: string): Promise<TeamApplicationInvitationSummary[]> {
    const invitations = await this.client.teamApplicationInvitation.findMany({
      where: { email: email.trim().toLowerCase() },
      orderBy: { createdAt: "desc" },
      select: { id: true, draftId: true, status: true, createdAt: true, draft: { select: { topicId: true, topic: { select: { title: true } }, leader: { select: { name: true, email: true } } } } },
    });
    return invitations.map(({ draft, ...invitation }) => ({ ...invitation, topicId: draft.topicId, topicTitle: draft.topic.title, leaderName: draft.leader.name, leaderEmail: draft.leader.email }));
  }

  async listByLeader(leaderId: string): Promise<TeamApplicationDraftSummary[]> {
    const drafts = await this.client.teamApplicationDraft.findMany({
      where: { leaderId },
      orderBy: { createdAt: "desc" },
      select: { id: true, topicId: true, createdAt: true, topic: { select: { title: true } }, invitations: { orderBy: { createdAt: "asc" }, select: { email: true, status: true } } },
    });
    return drafts.map(({ topic, ...draft }) => ({ ...draft, topicTitle: topic.title }));
  }

  cancelDraft(draftId: string, leaderId: string): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${draftId}, 3))::text AS "lock"`);
      const { count } = await transaction.teamApplicationDraft.deleteMany({ where: { id: draftId, leaderId } });
      return count === 1;
    });
  }

  respond(
    invitationId: string,
    actor: { id: string; email: string },
    decision: "ACCEPT" | "DECLINE",
    respondedAt: Date,
  ): Promise<"PENDING" | "APPLICATION_CREATED" | "DECLINED" | "NOT_FOUND" | "CONFLICT" | "TOPIC_UNAVAILABLE" | "MEMBER_UNAVAILABLE"> {
    return this.client.$transaction(async (transaction) => {
      const initial = await transaction.teamApplicationInvitation.findUnique({
        where: { id: invitationId },
        select: { draftId: true, draft: { select: { topicId: true } } },
      });
      if (!initial) return "NOT_FOUND";
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${initial.draftId}, 3))::text AS "lock"`);
      const programRows = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
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
      ) return "TOPIC_UNAVAILABLE";
      const teamRows = await transaction.$queryRaw<Array<{ status: "FORMING" | "CONFIRMED" | "CLOSED" }>>(Prisma.sql`
        SELECT "status" FROM "team" WHERE "topicId" = ${topic.id} FOR UPDATE
      `);
      if (teamRows[0] && teamRows[0].status !== "FORMING") return "TOPIC_UNAVAILABLE";
      const invitation = await transaction.teamApplicationInvitation.findUnique({
        where: { id: invitationId },
        select: { id: true, draftId: true, email: true, status: true },
      });
      if (!invitation || invitation.email !== actor.email.trim().toLowerCase()) return "NOT_FOUND";
      if (invitation.status !== "PENDING") return "CONFLICT";
      if (decision === "DECLINE") {
        await transaction.teamApplicationInvitation.update({ where: { id: invitation.id }, data: { status: "DECLINED", inviteeId: actor.id, respondedAt } });
        return "DECLINED";
      }
      const draft = await transaction.teamApplicationDraft.findUnique({ where: { id: invitation.draftId }, select: { id: true, topicId: true, leaderId: true } });
      if (!draft) return "NOT_FOUND";
      const draftAnswers = await transaction.teamApplicationDraftAnswer.findMany({ where: { draftId: draft.id }, select: { questionId: true, value: true } });
      const storedInvitations = await transaction.teamApplicationInvitation.findMany({ where: { draftId: draft.id }, orderBy: { createdAt: "asc" }, select: { id: true, inviteeId: true, email: true, status: true } });
      const invitations = storedInvitations.map((item) => item.id === invitation.id ? { ...item, status: "ACCEPTED" as const, inviteeId: actor.id } : item);
      if (invitations.some(({ status }) => status === "DECLINED")) return "CONFLICT";
      if (invitations.some(({ status }) => status === "PENDING")) {
        await transaction.teamApplicationInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", inviteeId: actor.id, respondedAt } });
        return "PENDING";
      }
      const memberIds = invitations.map(({ inviteeId }) => inviteeId).filter((id): id is string => Boolean(id));
      if (memberIds.length !== invitations.length) return "MEMBER_UNAVAILABLE";
      const participantIds = [draft.leaderId, ...memberIds];
      const participants = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
        SELECT "id", "role", "isActive" FROM "user" WHERE "id" IN (${Prisma.join(participantIds)}) ORDER BY "id" FOR UPDATE
      `);
      if (!areActiveStudents(participants, participantIds.length)) return "MEMBER_UNAVAILABLE";
      const membershipCount = await transaction.teamMember.count({ where: { academicCycleId: topic.academicCycleId, studentId: { in: participantIds } } });
      const existingApplicationCount = await transaction.topicApplication.count({ where: { topicId: topic.id, studentId: { in: participantIds } } });
      const team = await transaction.team.findUnique({ where: { topicId: topic.id }, select: { _count: { select: { members: true } } } });
      if (membershipCount > 0 || existingApplicationCount > 0) return "MEMBER_UNAVAILABLE";
      if ((team?._count.members ?? 0) + participantIds.length > topic.capacity) return "TOPIC_UNAVAILABLE";

      await transaction.teamApplicationInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", inviteeId: actor.id, respondedAt } });
      const group = await transaction.topicApplicationGroup.create({
        data: { topicId: topic.id, leaderId: draft.leaderId, kind: "TEAM", createdAt: respondedAt },
        select: { id: true },
      });
      await transaction.topicApplicationAnswer.createMany({ data: draftAnswers.map((answer) => ({ groupId: group.id, ...answer })) });
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "MEMBER_UNAVAILABLE" as const;
      throw error;
    });
  }

  async listByStudent(studentId: string, requestedPage: number, pageSize: number) {
    const [total, groupedCounts] = await Promise.all([
      this.client.topicApplication.count({ where: { studentId } }),
      this.client.topicApplication.groupBy({ by: ["status"], where: { studentId }, _count: { _all: true } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const applications = await this.client.topicApplication.findMany({
      where: { studentId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: studentSummarySelect,
    });
    return {
      items: applications.map(toStudentSummary),
      page,
      totalPages,
      total,
      counts: {
        PENDING: groupedCounts.find(({ status }) => status === "PENDING")?._count._all ?? 0,
        ACCEPTED: groupedCounts.find(({ status }) => status === "ACCEPTED")?._count._all ?? 0,
        REJECTED: groupedCounts.find(({ status }) => status === "REJECTED")?._count._all ?? 0,
      },
    };
  }

  async findByStudentAndTopic(studentId: string, topicId: string): Promise<TopicApplicationSummary | null> {
    const application = await this.client.topicApplication.findUnique({
      where: { topicId_studentId: { topicId, studentId } },
      select: studentSummarySelect,
    });
    return application ? toStudentSummary(application) : null;
  }

  async listByTopicAuthor(
    authorId: string,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    return this.listForProfessor({ topic: { authorId } });
  }

  listAll(): Promise<ProfessorTopicApplicationSummary[]> {
    return this.listForProfessor({});
  }

  async findVisibleById(
    id: string,
    viewer: ProfessorTopicApplicationViewer,
  ): Promise<ProfessorTopicApplicationSummary | null> {
    const application = await this.client.topicApplication.findFirst({
      where: { id, ...(viewer.isAdmin ? {} : { topic: { authorId: viewer.actorId } }), OR: [{ groupId: null }, { participantRole: "LEADER" }] },
      select: professorSummarySelect,
    });
    return application ? toProfessorSummary(application) : null;
  }

  private async listForProfessor(
    where: Prisma.TopicApplicationWhereInput,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    const applications = await this.client.topicApplication.findMany({
      where: { AND: [where, { OR: [{ groupId: null }, { participantRole: "LEADER" }] }] },
      orderBy: { createdAt: "desc" },
      select: professorSummarySelect,
    });

    applications.sort((left, right) => Number(right.status === "PENDING") - Number(left.status === "PENDING"));

    return applications.map(toProfessorSummary);
  }

  findDecisionState(
    id: string,
  ): Promise<TopicApplicationDecisionState | null> {
    return this.client.topicApplication.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        topic: { select: { authorId: true } },
      },
    }).then((application) =>
      application
        ? {
            id: application.id,
            status: application.status,
            topicAuthorId: application.topic.authorId,
          }
        : null,
    );
  }

  async accept(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<AcceptTopicApplicationOutcome> {
    for (let attempt = 1; attempt <= DECISION_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.acceptOnce(id, actor, decidedAt);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return isStudentCycleUniqueConflict(error)
            ? "STUDENT_ALREADY_ASSIGNED"
            : "CONFLICT";
        }
        if (error instanceof DecisionWriteConflictError) {
          return "CONFLICT";
        }
        if (isRetryableDecisionConflict(error)) {
          if (attempt < DECISION_TRANSACTION_ATTEMPTS) continue;
          return "CONFLICT";
        }
        throw error;
      }
    }
    return "CONFLICT";
  }

  async reject(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<RejectTopicApplicationOutcome> {
    for (let attempt = 1; attempt <= DECISION_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.rejectOnce(id, actor, decidedAt);
      } catch (error) {
        if (isRetryableDecisionConflict(error)) {
          if (attempt < DECISION_TRANSACTION_ATTEMPTS) continue;
          return "CONFLICT";
        }
        throw error;
      }
    }
    return "CONFLICT";
  }

  private rejectOnce(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<RejectTopicApplicationOutcome> {
    return this.client.$transaction(async (transaction) => {
      const initial = await transaction.topicApplication.findUnique({
        where: { id },
        select: { id: true, topicId: true, studentId: true, groupId: true },
      });
      if (!initial) return "CONFLICT";
      const initialTargets = initial.groupId
        ? await transaction.topicApplication.findMany({ where: { groupId: initial.groupId }, select: { id: true, studentId: true } })
        : [{ id: initial.id, studentId: initial.studentId }];
      if (!initialTargets.length) return "CONFLICT";

      await transaction.$queryRaw(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topicRows = await transaction.$queryRaw<Array<{ authorId: string; title: string }>>(Prisma.sql`
        SELECT "authorId", "title" FROM "topic" WHERE "id" = ${initial.topicId} FOR UPDATE
      `);
      const topic = topicRows[0];
      if (!topic) return "CONFLICT";

      const teamRows = await transaction.$queryRaw<Array<{ id: string; status: "FORMING" | "CONFIRMED" | "CLOSED" }>>(Prisma.sql`
        SELECT "id", "status" FROM "team" WHERE "topicId" = ${initial.topicId} FOR UPDATE
      `);
      const team = teamRows[0];

      const recruitment = initial.groupId === null
        ? await transaction.recruitmentApplication.findUnique({ where: { topicApplicationId: initial.id }, select: { postId: true } })
        : null;
      const postRows = recruitment
        ? await transaction.$queryRaw<Array<{ authorId: string; status: "OPEN" | "CLOSED"; teamId: string }>>(Prisma.sql`
            SELECT "authorId", "status", "teamId" FROM "recruitment_post" WHERE "id" = ${recruitment.postId} FOR UPDATE
          `)
        : [];

      const studentIds = initialTargets.map(({ studentId }) => studentId).sort();
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "user" WHERE "id" IN (${Prisma.join(studentIds)}) ORDER BY "id" FOR UPDATE
      `);

      const targets = await transaction.topicApplication.findMany({
        where: { id: { in: initialTargets.map(({ id: targetId }) => targetId) } },
        select: { id: true, studentId: true, status: true },
      });
      if (targets.length !== initialTargets.length || targets.some(({ status }) => status !== "PENDING")) return "CONFLICT";

      let recruiterAllowed = false;
      const post = postRows[0];
      recruiterAllowed = post?.authorId === actor.id && post.status === "OPEN" && post.teamId === team?.id && team.status === "FORMING";
      if (!actor.isAdmin && topic.authorId !== actor.id && !recruiterAllowed) return "FORBIDDEN";
      const result = await transaction.topicApplication.updateMany({ where: { id: { in: targets.map(({ id: targetId }) => targetId) }, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      if (result.count !== targets.length) return "CONFLICT";
      await transaction.recruitmentApplication.updateMany({ where: { topicApplicationId: { in: targets.map(({ id: targetId }) => targetId) }, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      for (const target of targets) {
        await createApplicationResultNotification(transaction, {
          applicationId: target.id,
          recipientId: target.studentId,
          topicTitle: topic.title,
          outcome: "REJECTED",
          createdAt: decidedAt,
        });
      }
      return "REJECTED";
    });
  }

  private acceptOnce(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<AcceptTopicApplicationOutcome> {
    return this.client.$transaction(
      async (transaction) => {
        const target = await transaction.topicApplication.findUnique({
          where: { id },
          select: { studentId: true, topicId: true, groupId: true },
        });
        if (!target) {
          return "CONFLICT";
        }
        if (target.groupId) {
          return this.acceptApplicationGroup(transaction, target.groupId, actor, decidedAt);
        }

        const lockedPrograms = await transaction.$queryRaw<Array<{
          status: "DRAFT" | "OPEN" | "CLOSED";
        }>>(Prisma.sql`
          SELECT "project_program"."status"
          FROM "project_program"
          JOIN "topic" ON "topic"."programId" = "project_program"."id"
          WHERE "topic"."id" = ${target.topicId}
          FOR UPDATE OF "project_program"
        `);
        const lockedTopics = await transaction.$queryRaw<Array<{ status: "DRAFT" | "PUBLISHED" | "CLOSED" }>>(Prisma.sql`
          SELECT "status" FROM "topic" WHERE "id" = ${target.topicId} FOR UPDATE
        `);
        if (lockedPrograms[0]?.status !== "OPEN" || lockedTopics[0]?.status !== "PUBLISHED") {
          return "CONFLICT";
        }

        const existingTeams = await transaction.$queryRaw<Array<{
          id: string;
          status: "FORMING" | "CONFIRMED" | "CLOSED";
        }>>(Prisma.sql`
          SELECT "id", "status"
          FROM "team"
          WHERE "topicId" = ${target.topicId}
          FOR UPDATE
        `);
        const existingTeam = existingTeams[0];
        if (existingTeam && existingTeam.status !== "FORMING") return "CONFLICT";

        const participants = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
          SELECT "id", "role", "isActive" FROM "user" WHERE "id" = ${target.studentId} FOR UPDATE
        `);
        if (!areActiveStudents(participants, 1)) return "CONFLICT";

        const application = await transaction.topicApplication.findUnique({
          where: { id },
          include: {
            topic: {
              select: {
                id: true,
                title: true,
                authorId: true,
                academicCycleId: true,
                capacity: true,
                status: true,
              },
            },
            recruitmentApplication: { include: { post: { include: { team: { select: { status: true } } } } } },
          },
        });
        if (!application || application.status !== "PENDING") {
          return "CONFLICT";
        }
        const recruiterAllowed = application.topic.status === "PUBLISHED" && application.recruitmentApplication?.post.authorId === actor.id && application.recruitmentApplication.post.status === "OPEN" && application.recruitmentApplication.post.team.status === "FORMING";
        if (!actor.isAdmin && application.topic.authorId !== actor.id && !recruiterAllowed) {
          return "FORBIDDEN";
        }

        const existingMembership = await transaction.teamMember.findUnique({
          where: {
            academicCycleId_studentId: {
              academicCycleId: application.topic.academicCycleId,
              studentId: application.studentId,
            },
          },
          select: { id: true },
        });
        if (existingMembership) {
          return "STUDENT_ALREADY_ASSIGNED";
        }

        const memberCount = existingTeam
          ? await transaction.teamMember.count({
              where: { teamId: existingTeam.id },
            })
          : 0;
        if (memberCount >= application.topic.capacity) {
          return "CAPACITY_REACHED";
        }

        const team = await transaction.team.upsert({
          where: { topicId: application.topicId },
          update: {},
          create: {
            academicCycleId: application.topic.academicCycleId,
            topicId: application.topicId,
            professorId: application.topic.authorId,
            name: application.topic.title,
          },
          select: { id: true },
        });
        await transaction.teamMember.create({
          data: {
            teamId: team.id,
            academicCycleId: application.topic.academicCycleId,
            topicId: application.topicId,
            studentId: application.studentId,
            applicationId: application.id,
            joinedAt: decidedAt,
          },
        });
        const accepted = await transaction.topicApplication.updateMany({
          where: { id: application.id, status: "PENDING" },
          data: { status: "ACCEPTED", decidedAt },
        });
        if (accepted.count !== 1) {
          throw new DecisionWriteConflictError();
        }
        await transaction.recruitmentApplication.updateMany({ where: { topicApplicationId: application.id, status: "PENDING" }, data: { status: "ACCEPTED", decidedAt } });

        const reachesCapacity = memberCount + 1 === application.topic.capacity;
        const directlyConflicting = await transaction.topicApplication.findMany({
          where: {
            id: { not: application.id },
            status: "PENDING",
            OR: [
              { studentId: application.studentId, topic: { academicCycleId: application.topic.academicCycleId } },
              ...(reachesCapacity ? [{ topicId: application.topicId }] : []),
            ],
          },
          select: { id: true, groupId: true },
        });
        const conflictingIds = directlyConflicting.map(({ id: conflictingId }) => conflictingId);
        const conflictingGroupIds = directlyConflicting.flatMap(({ groupId }) => groupId ? [groupId] : []);
        const automaticallyRejected = conflictingIds.length || conflictingGroupIds.length
          ? await transaction.topicApplication.findMany({
              where: {
                status: "PENDING",
                OR: [{ id: { in: conflictingIds } }, { groupId: { in: conflictingGroupIds } }],
              },
              select: { id: true, studentId: true, topic: { select: { title: true } } },
            })
          : [];
        if (automaticallyRejected.length) {
          const rejectedIds = automaticallyRejected.map(({ id: rejectedId }) => rejectedId);
          await transaction.topicApplication.updateMany({
            where: { id: { in: rejectedIds }, status: "PENDING" },
            data: { status: "REJECTED", decidedAt },
          });
          await transaction.recruitmentApplication.updateMany({
            where: { topicApplicationId: { in: rejectedIds }, status: "PENDING" },
            data: { status: "REJECTED", decidedAt },
          });
        }

        if (reachesCapacity) {
          await transaction.recruitmentPost.updateMany({ where: { teamId: team.id, status: "OPEN" }, data: { status: "CLOSED" } });
        }

        await createApplicationResultNotification(transaction, {
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "ACCEPTED",
          createdAt: decidedAt,
        });
        for (const rejected of automaticallyRejected) {
          await createApplicationResultNotification(transaction, {
            applicationId: rejected.id,
            recipientId: rejected.studentId,
            topicTitle: rejected.topic.title,
            outcome: "REJECTED",
            createdAt: decidedAt,
          });
        }

        return "ACCEPTED";
      },
    );
  }

  private async acceptApplicationGroup(
    transaction: Prisma.TransactionClient,
    groupId: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<AcceptTopicApplicationOutcome> {
    const group = await transaction.topicApplicationGroup.findUnique({
      where: { id: groupId },
      select: { topicId: true },
    });
    if (!group) return "CONFLICT";
    const applications = await transaction.topicApplication.findMany({
      where: { groupId },
      orderBy: { participantRole: "asc" },
      select: { id: true, studentId: true, status: true },
    });
    const programRows = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
      SELECT "project_program"."status"
      FROM "project_program"
      JOIN "topic" ON "topic"."programId" = "project_program"."id"
      WHERE "topic"."id" = ${group.topicId}
      FOR UPDATE OF "project_program"
    `);
    const topicRows = await transaction.$queryRaw<Array<{
      id: string;
      title: string;
      authorId: string;
      academicCycleId: string;
      capacity: number;
      status: "DRAFT" | "PUBLISHED" | "CLOSED";
    }>>(Prisma.sql`
      SELECT "topic"."id", "topic"."title", "topic"."authorId", "topic"."academicCycleId", "topic"."capacity",
             "topic"."status"
      FROM "topic"
      WHERE "topic"."id" = ${group.topicId}
      FOR UPDATE
    `);
    const topic = topicRows[0];
    if (
      !topic ||
      topic.status !== "PUBLISHED" ||
      programRows[0]?.status !== "OPEN" ||
      applications.length === 0 ||
      applications.some(({ status }) => status !== "PENDING")
    ) {
      return "CONFLICT";
    }
    if (!actor.isAdmin && topic.authorId !== actor.id) return "FORBIDDEN";

    const studentIds = applications.map(({ studentId }) => studentId);
    const existingTeams = await transaction.$queryRaw<Array<{ id: string; status: "FORMING" | "CONFIRMED" | "CLOSED" }>>(Prisma.sql`
      SELECT "id", "status" FROM "team" WHERE "topicId" = ${group.topicId} FOR UPDATE
    `);
    if (existingTeams[0] && existingTeams[0].status !== "FORMING") return "CONFLICT";
    const participants = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
      SELECT "id", "role", "isActive" FROM "user" WHERE "id" IN (${Prisma.join(studentIds)}) ORDER BY "id" FOR UPDATE
    `);
    if (!areActiveStudents(participants, studentIds.length)) return "CONFLICT";

    const existingMemberships = await transaction.teamMember.count({
      where: { academicCycleId: topic.academicCycleId, studentId: { in: studentIds } },
    });
    if (existingMemberships > 0) return "STUDENT_ALREADY_ASSIGNED";

    const memberCount = existingTeams[0]
      ? await transaction.teamMember.count({ where: { teamId: existingTeams[0].id } })
      : 0;
    if (memberCount + applications.length > topic.capacity) return "CAPACITY_REACHED";

    const team = await transaction.team.upsert({
      where: { topicId: group.topicId },
      update: {},
      create: {
        academicCycleId: topic.academicCycleId,
        topicId: group.topicId,
        professorId: topic.authorId,
        name: topic.title,
      },
      select: { id: true },
    });
    await transaction.teamMember.createMany({
      data: applications.map((application) => ({
        teamId: team.id,
        academicCycleId: topic.academicCycleId,
        topicId: group.topicId,
        studentId: application.studentId,
        applicationId: application.id,
        joinedAt: decidedAt,
      })),
    });
    const accepted = await transaction.topicApplication.updateMany({
      where: { groupId, status: "PENDING" },
      data: { status: "ACCEPTED", decidedAt },
    });
    if (accepted.count !== applications.length) throw new DecisionWriteConflictError();

    const reachesCapacity = memberCount + applications.length === topic.capacity;
    const directlyConflicting = await transaction.topicApplication.findMany({
      where: {
        id: { notIn: applications.map(({ id }) => id) },
        status: "PENDING",
        OR: [
          { studentId: { in: studentIds }, topic: { academicCycleId: topic.academicCycleId } },
          ...(reachesCapacity ? [{ topicId: group.topicId }] : []),
        ],
      },
      select: { id: true, groupId: true },
    });
    const conflictingGroupIds = directlyConflicting.flatMap(({ groupId: conflictingGroupId }) => conflictingGroupId ? [conflictingGroupId] : []);
    const conflictingIds = directlyConflicting.map(({ id: conflictingId }) => conflictingId);
    const automaticallyRejected = conflictingIds.length || conflictingGroupIds.length
      ? await transaction.topicApplication.findMany({
          where: { status: "PENDING", OR: [{ id: { in: conflictingIds } }, { groupId: { in: conflictingGroupIds } }] },
          select: { id: true, studentId: true, topic: { select: { title: true } } },
        })
      : [];
    if (automaticallyRejected.length) {
      await transaction.topicApplication.updateMany({
        where: { id: { in: automaticallyRejected.map(({ id }) => id) }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { topicApplicationId: { in: automaticallyRejected.map(({ id }) => id) }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
    }
    if (reachesCapacity) {
      await transaction.recruitmentPost.updateMany({ where: { teamId: team.id, status: "OPEN" }, data: { status: "CLOSED" } });
    }

    for (const application of applications) {
      await createApplicationResultNotification(transaction, {
        applicationId: application.id,
        recipientId: application.studentId,
        topicTitle: topic.title,
        outcome: "ACCEPTED",
        createdAt: decidedAt,
      });
    }
    for (const rejected of automaticallyRejected) {
      await createApplicationResultNotification(transaction, {
        applicationId: rejected.id,
        recipientId: rejected.studentId,
        topicTitle: rejected.topic.title,
        outcome: "REJECTED",
        createdAt: decidedAt,
      });
    }
    return "ACCEPTED";
  }
}

class DecisionWriteConflictError extends Error {}

function isStudentCycleUniqueConflict(
  error: Prisma.PrismaClientKnownRequestError,
): boolean {
  const target = error.meta?.target;
  return (
    Array.isArray(target) &&
    target.includes("academicCycleId") &&
    target.includes("studentId")
  );
}

function areActiveStudents(
  users: Array<{ role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>,
  expectedCount: number,
): boolean {
  return users.length === expectedCount && users.every(({ role, isActive }) => role === "STUDENT" && isActive);
}

const DECISION_TRANSACTION_ATTEMPTS = 3;

function isRetryableDecisionConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}
