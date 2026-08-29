import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  activeProjectTeamMembershipInProgram,
  belongsToProjectTeamInProgram,
} from "@/modules/project-team/domain/project-team-membership-scope";
import { areActiveStudents } from "@/modules/topic-application/infrastructure/prisma-topic-application-utils";
import type {
  CreateTopicApplicationInput,
  CreateTopicApplicationResult,
  TopicApplicationCreator,
  TopicApplicationConfiguration,
} from "@/modules/topic-application/application/topic-application-ports";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

export class PrismaTopicApplicationSubmissionRepository
  implements TopicApplicationCreator
{
  constructor(private readonly client: PrismaClient) {}

  async findConfiguration(topicId: string, appliedAt: Date): Promise<TopicApplicationConfiguration | null> {
    const topic = await this.client.topic.findFirst({
      where: { id: topicId, status: "ACTIVE", recruitmentEnabled: true, program: { isPublic: true, endsAt: { gt: appliedAt }, studentProjectCreationEnabled: false, recruitmentStartsAt: { lte: appliedAt }, recruitmentEndsAt: { gt: appliedAt } } },
      select: { id: true, applicationMode: true, capacity: true, applicationQuestions: { orderBy: { position: "asc" }, select: { id: true, label: true, maxLength: true, required: true } } },
    });
    return topic ? { topicId: topic.id, mode: topic.applicationMode, capacity: topic.capacity, questions: topic.applicationQuestions } : null;
  }

  async createIndividualIfAvailable(
    input: CreateTopicApplicationInput & { kind: "INDIVIDUAL" },
  ): Promise<CreateTopicApplicationResult> {
    const id = randomUUID();
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ isPublic: boolean; endsAt: Date; studentProjectCreationEnabled: boolean; recruitmentStartsAt: Date | null; recruitmentEndsAt: Date | null }>>(Prisma.sql`
        SELECT "project_program"."isPublic", "project_program"."endsAt", "project_program"."studentProjectCreationEnabled", "project_program"."recruitmentStartsAt", "project_program"."recruitmentEndsAt"
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
          AND "topic"."status" = 'ACTIVE'
          AND "topic"."recruitmentEnabled" = true
        FOR UPDATE
      `);
      const topic = topics[0];
      if (!programs[0]?.isPublic || programs[0].endsAt <= input.appliedAt || programs[0].studentProjectCreationEnabled || !programs[0].recruitmentStartsAt || !programs[0].recruitmentEndsAt || programs[0].recruitmentStartsAt > input.appliedAt || programs[0].recruitmentEndsAt <= input.appliedAt || !topic) {
        return { outcome: "TOPIC_UNAVAILABLE" } as const;
      }
      if (topic.applicationMode === "TEAM_ONLY") return { outcome: "TOPIC_UNAVAILABLE" } as const;

      const teams = await transaction.$queryRaw<Array<{ confirmedAt: Date | null }>>(Prisma.sql`
        SELECT "confirmedAt" FROM "project_team" WHERE "projectId" = ${input.topicId} FOR UPDATE
      `);
      if (teams[0]?.confirmedAt) return { outcome: "TOPIC_UNAVAILABLE" } as const;
      const students = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN" }>>(Prisma.sql`
        SELECT "id", "role", "accountStatus" FROM "user" WHERE "id" = ${input.studentId} FOR UPDATE
      `);
      if (!areActiveStudents(students, 1)) return { outcome: "TOPIC_UNAVAILABLE" } as const;

      const membership = await transaction.projectTeamMembership.findFirst({
        where: { userId: input.studentId, ...activeProjectTeamMembershipInProgram(topic.programId) },
        select: { id: true },
      });
      if (membership) {
        return { outcome: "STUDENT_ALREADY_IN_PROJECT" } as const;
      }

      const team = await transaction.projectTeam.findUnique({
        where: { projectId: input.topicId },
        select: { _count: { select: { memberships: { where: { endedAt: null } } } } },
      });
      if ((team?._count.memberships ?? 0) >= topic.capacity) {
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
      await notifyTopicApplicationSubmitted(transaction, input.topicId, group.id, [input.studentId], input.appliedAt);
      return { outcome: "CREATED", id } as const;
    });
  }

  async createTeamFromStudentTeam(
    input: CreateTopicApplicationInput & { kind: "TEAM"; studentTeamId: string },
  ): Promise<CreateTopicApplicationResult> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ isPublic: boolean; endsAt: Date; studentProjectCreationEnabled: boolean; projectTeamMaxSize: number; recruitmentStartsAt: Date | null; recruitmentEndsAt: Date | null }>>(Prisma.sql`
        SELECT "project_program"."isPublic", "project_program"."endsAt", "project_program"."studentProjectCreationEnabled", "project_program"."projectTeamMaxSize", "project_program"."recruitmentStartsAt", "project_program"."recruitmentEndsAt"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${input.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{ id: string; programId: string; capacity: number; applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM" }>>(Prisma.sql`
        SELECT "id", "programId", "capacity", "applicationMode" FROM "topic"
        WHERE "id" = ${input.topicId} AND "status" = 'ACTIVE'
          AND "recruitmentEnabled" = true
        FOR UPDATE
      `);
      const topic = topics[0];
      if (!programs[0]?.isPublic || programs[0].endsAt <= input.appliedAt || programs[0].studentProjectCreationEnabled || !programs[0].recruitmentStartsAt || !programs[0].recruitmentEndsAt || programs[0].recruitmentStartsAt > input.appliedAt || programs[0].recruitmentEndsAt <= input.appliedAt || !topic || topic.applicationMode === "INDIVIDUAL_ONLY") return { outcome: "TOPIC_UNAVAILABLE" } as const;

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
        select: { studentId: true, role: true, student: { select: { role: true, accountStatus: true } } },
      });
      if (members.length === 0 || members.length > programs[0].projectTeamMaxSize || members.length > topic.capacity || !areActiveStudents(members.map(({ student, studentId }) => ({ id: studentId, ...student })), members.length)) {
        return { outcome: "TEAM_MEMBER_UNAVAILABLE" } as const;
      }
      const memberIds = members.map(({ studentId }) => studentId);
      const unavailable = await transaction.user.count({ where: { id: { in: memberIds }, OR: [
        belongsToProjectTeamInProgram(topic.programId),
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
      await notifyTopicApplicationSubmitted(transaction, input.topicId, group.id, memberIds, input.appliedAt);
      return { outcome: "CREATED", id: applications.find(({ studentId }) => studentId === input.studentId)!.id } as const;
    });
  }

}

async function notifyTopicApplicationSubmitted(
  transaction: Prisma.TransactionClient,
  topicId: string,
  groupId: string,
  applicantIds: string[],
  createdAt: Date,
) {
  const topic = await transaction.topic.findUnique({
    where: { id: topicId },
    select: { title: true, managerId: true, assistants: { select: { userId: true } } },
  });
  if (!topic) return;
  const reviewerIds = [...new Set([
    ...(topic.managerId ? [topic.managerId] : []),
    ...topic.assistants.map(({ userId }) => userId),
  ])];
  const reviewerTitle = "프로젝트 지원이 도착했습니다";
  const reviewerBody = `${topic.title} 프로젝트 지원서를 확인해 주세요.`;
  const reviewerTitleEn = "New project application";
  const reviewerBodyEn = `Review the application for ${topic.title} in PMS.`;
  const reviewerHref = `/professor/applications?topicId=${encodeURIComponent(topicId)}`;
  const applicantTitle = "프로젝트 지원이 접수되었습니다";
  const applicantBody = `${topic.title} 프로젝트 지원이 접수되었습니다. 검토 결과는 PMS에서 안내합니다.`;
  const applicantTitleEn = "Project application received";
  const applicantBodyEn = `Your application for ${topic.title} was received. PMS will provide the review result.`;
  const applicantHref = "/dashboard";
  const recipients = [
    ...reviewerIds.map((recipientId) => ({ recipientId, title: reviewerTitle, body: reviewerBody, titleEn: reviewerTitleEn, bodyEn: reviewerBodyEn, href: reviewerHref, key: `topic-application-submitted:${groupId}:${recipientId}` })),
    ...[...new Set(applicantIds)].map((recipientId) => ({ recipientId, title: applicantTitle, body: applicantBody, titleEn: applicantTitleEn, bodyEn: applicantBodyEn, href: applicantHref, key: `topic-application-receipt:${groupId}:${recipientId}` })),
  ];
  if (!recipients.length) return;
  await transaction.notification.createMany({
    data: recipients.map(({ recipientId, title, body, href, key }) => ({
      recipientId,
      type: "SYSTEM" as const,
      title,
      body,
      href,
      dedupeKey: key,
      createdAt,
    })),
    skipDuplicates: true,
  });
  await enqueueEmailEvents(transaction, recipients.map(({ recipientId, title, body, titleEn, bodyEn, href, key }) => ({
    kind: "TOPIC_APPLICATION" as const,
    recipientId,
    title,
    body,
    titleEn,
    bodyEn,
    href,
    idempotencyKey: `email:${key}`,
    createdAt,
  })));
}
