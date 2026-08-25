import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaStudentTeamCommandRepository } from "@/modules/student-team/infrastructure/prisma-student-team-command-repository";

const runIntegration = process.env.STUDENT_TEAM_INTEGRATION_TEST === "true" ? it : it.skip;

describe("PrismaStudentTeamCommandRepository 사전 팀 이탈", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    if (!process.env.STUDENT_TEAM_INTEGRATION_TEST) return;
    ({ prisma } = await import("@/shared/infrastructure/database/prisma"));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  runIntegration("팀에서 나가면 그 팀으로 낸 대기 중 지원이 함께 물린다", async () => {
    const client = prisma;
    if (!client) throw new Error("DATABASE_URL 환경변수가 필요합니다.");

    const suffix = randomUUID().slice(0, 8);
    const leaderId = `leader-${suffix}`;
    const memberId = `member-${suffix}`;
    const authorId = `author-${suffix}`;
    const programId = randomUUID();
    const topicId = randomUUID();
    const teamId = randomUUID();
    const groupId = randomUUID();
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);

    const cleanup = async () => {
      await client.topicApplication.deleteMany({ where: { topicId } });
      await client.topicApplicationGroup.deleteMany({ where: { id: groupId } });
      await client.studentTeamMember.deleteMany({ where: { teamId } });
      await client.studentTeam.deleteMany({ where: { id: teamId } });
      await client.topic.deleteMany({ where: { programId } });
      await client.projectProgram.deleteMany({ where: { id: programId } });
      await client.user.deleteMany({ where: { id: { in: [leaderId, memberId, authorId] } } });
    };

    await cleanup();
    try {
      await client.user.createMany({
        data: [
          { id: leaderId, name: "이탈 검증 팀장", email: `leader-${suffix}@pusan.ac.kr`, role: "STUDENT" },
          { id: memberId, name: "이탈 검증 팀원", email: `member-${suffix}@pusan.ac.kr`, role: "STUDENT" },
          { id: authorId, name: "이탈 검증 교수", email: `author-${suffix}@pusan.ac.kr`, role: "PROFESSOR" },
        ],
      });
      await client.projectProgram.create({
        data: {
          id: programId,
          name: `이탈 검증 프로그램 ${suffix}`,
          category: "이탈 검증",
          startsAt: past,
          endsAt: future,
          projectRegistrationStartsAt: past,
          projectRegistrationEndsAt: future,
          recruitmentStartsAt: past,
          recruitmentEndsAt: future,
          executionStartsAt: past,
          executionEndsAt: future,
          isPublic: true,
          topics: {
            create: [
              { id: topicId, authorId, title: "이탈 검증 주제", description: "설명", capacity: 4, status: "ACTIVE", publishedAt: past },
            ],
          },
        },
      });
      await client.studentTeam.create({
        data: {
          id: teamId,
          name: `이탈 검증 팀 ${suffix}`,
          description: "설명",
          leaderId,
          members: {
            create: [
              { studentId: leaderId, role: "LEADER" },
              { studentId: memberId, role: "MEMBER" },
            ],
          },
        },
      });
      await client.topicApplicationGroup.create({
        data: {
          id: groupId,
          topicId,
          leaderId,
          studentTeamId: teamId,
          kind: "TEAM",
          applications: {
            create: [
              { topicId, studentId: leaderId, participantRole: "LEADER", message: "지원합니다" },
              { topicId, studentId: memberId, participantRole: "MEMBER", message: "지원합니다" },
            ],
          },
        },
      });

      const repository = new PrismaStudentTeamCommandRepository(client);
      const outcome = await repository.leave({ teamId, studentId: memberId, leftAt: new Date() });

      expect(outcome).toBe("LEFT");
      const applications = await client.topicApplication.findMany({
        where: { topicId },
        select: { studentId: true, status: true },
      });
      const byStudent = new Map(applications.map(({ studentId, status }) => [studentId, status]));
      // 나간 사람만 빠지고 남은 팀장의 지원은 그대로 심사를 기다린다.
      expect(byStudent.get(memberId)).toBe("WITHDRAWN");
      expect(byStudent.get(leaderId)).toBe("PENDING");
    } finally {
      await cleanup();
    }
  }, 30_000);
});
