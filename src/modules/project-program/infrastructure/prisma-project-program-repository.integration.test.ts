import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";

const runIntegration = process.env.PROJECT_PROGRAM_INTEGRATION_TEST === "true" ? it : it.skip;

describe("PrismaProjectProgramRepository 투표 정책 변경 PostgreSQL", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    if (!process.env.PROJECT_PROGRAM_INTEGRATION_TEST) return;
    ({ prisma } = await import("@/shared/infrastructure/database/prisma"));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  runIntegration("한도를 올려도 이미 던진 표를 지우지 않는다", async () => {
    const client = prisma;
    if (!client) throw new Error("DATABASE_URL 환경변수가 필요합니다.");

    const suffix = randomUUID().slice(0, 8);
    const adminId = `admin-${suffix}`;
    const voterId = `voter-${suffix}`;
    const authorId = `author-${suffix}`;
    const programId = randomUUID();
    const topicAId = randomUUID();
    const topicBId = randomUUID();
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);

    const cleanup = async () => {
      await client.projectVote.deleteMany({ where: { programId } });
      await client.topic.deleteMany({ where: { programId } });
      await client.programVotingPolicy.deleteMany({ where: { programId } });
      await client.projectProgram.deleteMany({ where: { id: programId } });
      await client.user.deleteMany({ where: { id: { in: [adminId, voterId, authorId] } } });
    };

    await cleanup();
    try {
      await client.user.createMany({
        data: [
          { id: adminId, name: "정책 검증 관리자", email: `admin-${suffix}@pusan.ac.kr`, role: "ADMIN" },
          { id: voterId, name: "정책 검증 투표자", email: `voter-${suffix}@pusan.ac.kr`, role: "STUDENT" },
          { id: authorId, name: "정책 검증 교수", email: `author-${suffix}@pusan.ac.kr`, role: "PROFESSOR" },
        ],
      });
      const base = {
        name: `정책 검증 프로그램 ${suffix}`,
        category: "정책 검증",
        startsAt: past,
        endsAt: future,
        projectRegistrationStartsAt: past,
        projectRegistrationEndsAt: future,
        recruitmentStartsAt: past,
        recruitmentEndsAt: future,
        executionStartsAt: past,
        executionEndsAt: future,
      };
      await client.projectProgram.create({
        data: {
          id: programId,
          ...base,
          isPublic: true,
          votingPolicy: { create: { startsAt: past, endsAt: future, voteLimit: 2, staffVoteLimit: 3 } },
          topics: {
            create: [
              { id: topicAId, authorId, title: "프로젝트 A", description: "A", capacity: 4, status: "ACTIVE", publishedAt: past },
              { id: topicBId, authorId, title: "프로젝트 B", description: "B", capacity: 4, status: "ACTIVE", publishedAt: past },
            ],
          },
        },
      });
      await client.projectVote.createMany({
        data: [topicAId, topicBId].map((topicId) => ({ programId, topicId, voterId, createdAt: new Date() })),
      });

      const repository = new PrismaProjectProgramRepository(client);
      const outcome = await repository.updateSettings(programId, {
        ...base,
        isPublic: true,
        votingPolicy: { startsAt: past, endsAt: future, voteLimit: 5, staffVoteLimit: 5, voteLimitScope: "PROGRAM", selfVotingAllowed: false, resultsVisibleDuringVoting: false, resultsVisibleAfterVoting: false },
      }, adminId);

      expect(outcome).toBe("UPDATED");
      expect(await client.projectVote.count({ where: { programId } })).toBe(2);
      expect((await client.programVotingPolicy.findUnique({ where: { programId } }))?.voteLimit).toBe(5);
    } finally {
      await cleanup();
    }
  }, 30_000);
});
