import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";

const runIntegration = process.env.PROJECT_VOTING_INTEGRATION_TEST === "true" ? it : it.skip;

describe("PrismaProjectVotingRepository PostgreSQL 동시성", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    if (!process.env.PROJECT_VOTING_INTEGRATION_TEST) return;
    ({ prisma } = await import("@/shared/infrastructure/database/prisma"));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  runIntegration("같은 사람이 서로 다른 프로젝트를 동시에 찍어도 표가 사라지지 않는다", async () => {
    const client = prisma;
    if (!client) throw new Error("DATABASE_URL 환경변수가 필요합니다.");

    const suffix = randomUUID().slice(0, 8);
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
      await client.projectProgram.deleteMany({ where: { id: programId } });
      await client.user.deleteMany({ where: { id: { in: [voterId, authorId] } } });
    };

    await cleanup();
    try {
      await client.user.createMany({
        data: [
          { id: voterId, name: "동시성 검증 투표자", email: `voter-${suffix}@pusan.ac.kr`, role: "STUDENT" },
          { id: authorId, name: "동시성 검증 교수", email: `author-${suffix}@pusan.ac.kr`, role: "PROFESSOR" },
        ],
      });
      await client.projectProgram.create({
        data: {
          id: programId,
          name: `동시성 검증 프로그램 ${suffix}`,
          category: "동시성 검증",
          startsAt: past,
          endsAt: future,
          projectRegistrationStartsAt: past,
          projectRegistrationEndsAt: future,
          recruitmentStartsAt: past,
          recruitmentEndsAt: future,
          executionStartsAt: past,
          executionEndsAt: future,
          isPublic: true,
          votingPolicy: { create: { startsAt: past, endsAt: future, voteLimit: 5, staffVoteLimit: 5 } },
          topics: {
            create: [
              { id: topicAId, authorId, title: "프로젝트 A", description: "A", capacity: 4, status: "ACTIVE", publishedAt: past },
              { id: topicBId, authorId, title: "프로젝트 B", description: "B", capacity: 4, status: "ACTIVE", publishedAt: past },
            ],
          },
        },
      });

      const repository = new PrismaProjectVotingRepository(client);
      const votedAt = new Date();
      const [first, second] = await Promise.all([
        repository.toggleVote({ programId, voterId, topicId: topicAId, votedAt }),
        repository.toggleVote({ programId, voterId, topicId: topicBId, votedAt }),
      ]);

      expect(first.status).toBe("SAVED");
      expect(second.status).toBe("SAVED");
      const stored = await client.projectVote.findMany({ where: { programId, voterId }, select: { topicId: true } });
      expect(stored.map(({ topicId }) => topicId).sort()).toEqual([topicAId, topicBId].sort());
    } finally {
      await cleanup();
    }
  }, 30_000);
});
