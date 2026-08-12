import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { areActiveStudents } from "@/modules/topic-application/infrastructure/prisma-topic-application-utils";
import type {
  CreateTopicApplicationInput,
  CreateTopicApplicationResult,
  TopicApplicationCreator,
  TopicApplicationConfiguration,
} from "@/modules/topic-application/application/topic-application-ports";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaTopicApplicationSubmissionRepository
  implements TopicApplicationCreator
{
  constructor(private readonly client: PrismaClient) {}

  async findConfiguration(topicId: string, appliedAt: Date): Promise<TopicApplicationConfiguration | null> {
    const topic = await this.client.topic.findFirst({
      where: { id: topicId, status: "PUBLISHED", recruitmentEnabled: true, program: { isPublic: true, lifecycleStatus: "ACTIVE", recruitmentStartsAt: { lte: appliedAt }, recruitmentEndsAt: { gt: appliedAt } } },
      select: { id: true, applicationMode: true, capacity: true, applicationQuestions: { orderBy: { position: "asc" }, select: { id: true, label: true, maxLength: true, required: true } } },
    });
    return topic ? { topicId: topic.id, mode: topic.applicationMode, capacity: topic.capacity, questions: topic.applicationQuestions } : null;
  }

  async createIndividualIfAvailable(
    input: CreateTopicApplicationInput & { kind: "INDIVIDUAL" },
  ): Promise<CreateTopicApplicationResult> {
    const id = randomUUID();
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ isPublic: boolean; lifecycleStatus: "ACTIVE" | "CLOSED"; recruitmentStartsAt: Date; recruitmentEndsAt: Date }>>(Prisma.sql`
        SELECT "project_program"."isPublic", "project_program"."lifecycleStatus", "project_program"."recruitmentStartsAt", "project_program"."recruitmentEndsAt"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${input.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<
        Array<{ id: string; programId: string; capacity: number; applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM" }>
      >(Prisma.sql`
        SELECT "topic"."id", "topic"."programId", "topic"."capacity", "topic"."applicationMode"
        FROM "topic"
        WHERE "topic"."id" = ${input.topicId}
          AND "topic"."status" = 'PUBLISHED'
          AND "topic"."recruitmentEnabled" = true
        FOR UPDATE
      `);
      const topic = topics[0];
      if (!programs[0]?.isPublic || programs[0].lifecycleStatus !== "ACTIVE" || programs[0].recruitmentStartsAt > input.appliedAt || programs[0].recruitmentEndsAt <= input.appliedAt || !topic) {
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
          programId_studentId: {
            programId: topic.programId,
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
      await enqueueTranslations(transaction, input.answers.map(({ value }) => value));
      return { outcome: "CREATED", id } as const;
    });
  }

  async createTeamFromStudentTeam(
    input: CreateTopicApplicationInput & { kind: "TEAM"; studentTeamId: string },
  ): Promise<CreateTopicApplicationResult> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ isPublic: boolean; lifecycleStatus: "ACTIVE" | "CLOSED"; recruitmentStartsAt: Date; recruitmentEndsAt: Date }>>(Prisma.sql`
        SELECT "project_program"."isPublic", "project_program"."lifecycleStatus", "project_program"."recruitmentStartsAt", "project_program"."recruitmentEndsAt"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${input.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{ id: string; programId: string; capacity: number; applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM" }>>(Prisma.sql`
        SELECT "id", "programId", "capacity", "applicationMode" FROM "topic"
        WHERE "id" = ${input.topicId} AND "status" = 'PUBLISHED'
          AND "recruitmentEnabled" = true
        FOR UPDATE
      `);
      const topic = topics[0];
      if (!programs[0]?.isPublic || programs[0].lifecycleStatus !== "ACTIVE" || programs[0].recruitmentStartsAt > input.appliedAt || programs[0].recruitmentEndsAt <= input.appliedAt || !topic || topic.applicationMode === "INDIVIDUAL_ONLY") return { outcome: "TOPIC_UNAVAILABLE" } as const;

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
        { teamMemberships: { some: { programId: topic.programId } } },
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
        message: "팀 지원서",
        skills: ["팀 지원서"],
        desiredRole: "팀 내 역할 협의",
        availability: "팀 일정에 따름",
        status: "PENDING" as const,
        createdAt: input.appliedAt,
        updatedAt: input.appliedAt,
      }));
      await transaction.topicApplication.createMany({ data: applications });
      await enqueueTranslations(transaction, input.answers.map(({ value }) => value));
      return { outcome: "CREATED", id: applications.find(({ studentId }) => studentId === input.studentId)!.id } as const;
    });
  }

}
