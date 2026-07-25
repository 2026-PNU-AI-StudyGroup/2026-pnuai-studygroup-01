import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicApplicationDecisionRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-decision-repository";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { areActiveStudents } from "@/modules/topic-application/infrastructure/prisma-topic-application-utils";
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

export class PrismaTopicApplicationRepository
  implements
    TopicApplicationCreator,
    TopicApplicationLister,
    ProfessorTopicApplicationLister,
    ProfessorTopicApplicationReader,
    TopicApplicationDecisionRepository,
    TeamApplicationInvitationRepository
{
  private readonly decisionRepository: PrismaTopicApplicationDecisionRepository;
  private readonly queryRepository: PrismaTopicApplicationQueryRepository;

  constructor(private readonly client: PrismaClient) {
    this.decisionRepository = new PrismaTopicApplicationDecisionRepository(client);
    this.queryRepository = new PrismaTopicApplicationQueryRepository(client);
  }

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

  async createTeamFromStudentTeam(
    input: CreateTopicApplicationInput & { kind: "TEAM"; studentTeamId: string },
  ): Promise<CreateTopicApplicationResult> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${input.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{ id: string; academicCycleId: string; capacity: number; applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM" }>>(Prisma.sql`
        SELECT "id", "academicCycleId", "capacity", "applicationMode" FROM "topic"
        WHERE "id" = ${input.topicId} AND "status" = 'PUBLISHED'
          AND "recruitmentStartsAt" <= ${input.appliedAt} AND "recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE
      `);
      const topic = topics[0];
      if (programs[0]?.status !== "OPEN" || !topic || topic.applicationMode === "INDIVIDUAL_ONLY") return { outcome: "TOPIC_UNAVAILABLE" } as const;

      const studentTeams = await transaction.$queryRaw<Array<{ id: string; leaderId: string }>>(Prisma.sql`
        SELECT "id", "leaderId" FROM "student_team"
        WHERE "id" = ${input.studentTeamId} AND "deletedAt" IS NULL
        FOR UPDATE
      `);
      const studentTeam = studentTeams[0];
      if (!studentTeam || studentTeam.leaderId !== input.studentId) return { outcome: "TEAM_MEMBER_UNAVAILABLE" } as const;

      const members = await transaction.studentTeamMember.findMany({
        where: { teamId: input.studentTeamId },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: { studentId: true, role: true, student: { select: { role: true, isActive: true } } },
      });
      if (members.length === 0 || members.length > topic.capacity || !areActiveStudents(members.map(({ student, studentId }) => ({ id: studentId, ...student })), members.length)) {
        return { outcome: "TEAM_MEMBER_UNAVAILABLE" } as const;
      }
      const memberIds = members.map(({ studentId }) => studentId);
      const unavailable = await transaction.user.count({ where: { id: { in: memberIds }, OR: [
        { teamMemberships: { some: { academicCycleId: topic.academicCycleId } } },
        { topicApplications: { some: { topicId: input.topicId } } },
      ] } });
      if (unavailable) return { outcome: "TEAM_MEMBER_UNAVAILABLE" } as const;
      const questionCount = await transaction.topicApplicationQuestion.count({ where: { topicId: input.topicId, id: { in: input.answers.map(({ questionId }) => questionId) } } });
      if (questionCount !== input.answers.length) return { outcome: "TOPIC_UNAVAILABLE" } as const;

      const group = await transaction.topicApplicationGroup.create({
        data: { topicId: input.topicId, leaderId: input.studentId, studentTeamId: input.studentTeamId, kind: "TEAM", createdAt: input.appliedAt },
        select: { id: true },
      });
      await transaction.topicApplicationAnswer.createMany({ data: input.answers.map((answer) => ({ groupId: group.id, ...answer })) });
      const applications = members.map((member) => ({
        id: randomUUID(),
        topicId: input.topicId,
        studentId: member.studentId,
        groupId: group.id,
        participantRole: member.studentId === input.studentId ? "LEADER" as const : "MEMBER" as const,
        message: "지속형 팀 지원서",
        skills: ["지속형 팀 지원서"],
        desiredRole: "팀 내 역할 협의",
        availability: "팀 일정에 따름",
        status: "PENDING" as const,
        createdAt: input.appliedAt,
        updatedAt: input.appliedAt,
      }));
      await transaction.topicApplication.createMany({ data: applications });
      return { outcome: "CREATED", id: applications.find(({ studentId }) => studentId === input.studentId)!.id } as const;
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

  listByStudent(studentId: string, requestedPage: number, pageSize: number) {
    return this.queryRepository.listByStudent(studentId, requestedPage, pageSize);
  }

  findByStudentAndTopic(studentId: string, topicId: string): Promise<TopicApplicationSummary | null> {
    return this.queryRepository.findByStudentAndTopic(studentId, topicId);
  }

  listByTopicAuthor(authorId: string): Promise<ProfessorTopicApplicationSummary[]> {
    return this.queryRepository.listByTopicAuthor(authorId);
  }

  listAll(): Promise<ProfessorTopicApplicationSummary[]> {
    return this.queryRepository.listAll();
  }

  findVisibleById(
    id: string,
    viewer: ProfessorTopicApplicationViewer,
  ): Promise<ProfessorTopicApplicationSummary | null> {
    return this.queryRepository.findVisibleById(id, viewer);
  }

  findDecisionState(id: string): Promise<TopicApplicationDecisionState | null> {
    return this.decisionRepository.findDecisionState(id);
  }

  accept(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment = "",
  ): Promise<AcceptTopicApplicationOutcome> {
    return this.decisionRepository.accept(id, actor, decidedAt, reviewComment);
  }

  reject(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment = "",
  ): Promise<RejectTopicApplicationOutcome> {
    return this.decisionRepository.reject(id, actor, decidedAt, reviewComment);
  }
}
