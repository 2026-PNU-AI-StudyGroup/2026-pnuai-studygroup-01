import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { areActiveStudents } from "@/modules/topic-application/infrastructure/prisma-topic-application-utils";
import type {
  CreateTopicApplicationInput,
  CreateTopicApplicationResult,
  TopicApplicationCreator,
  TopicApplicationConfiguration,
} from "@/modules/topic-application/application/topic-application-ports";

export class PrismaTopicApplicationSubmissionRepository
  implements TopicApplicationCreator
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

}
