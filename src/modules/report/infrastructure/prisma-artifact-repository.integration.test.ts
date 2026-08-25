import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaArtifactRepository } from "@/modules/report/infrastructure/prisma-artifact-repository";

const runIntegration = process.env.ARTIFACT_INTEGRATION_TEST === "true" ? it : it.skip;

describe("PrismaArtifactRepository 결과물 갤러리", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    if (!process.env.ARTIFACT_INTEGRATION_TEST) return;
    ({ prisma } = await import("@/shared/infrastructure/database/prisma"));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  runIntegration("새 사진은 갤러리 맨 뒤에 붙고 내린 대표 이미지는 파일까지 지운다", async () => {
    const client = prisma;
    if (!client) throw new Error("DATABASE_URL 환경변수가 필요합니다.");

    const suffix = randomUUID().slice(0, 8);
    const adminId = `admin-${suffix}`;
    const programId = randomUUID();
    const topicId = randomUUID();
    const teamId = randomUUID();
    const thumbnailFileId = randomUUID();
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);

    const cleanup = async () => {
      await client.artifact.deleteMany({ where: { projectTeamId: teamId } });
      await client.storedFile.deleteMany({ where: { projectTeamId: teamId } });
      await client.projectTeam.deleteMany({ where: { id: teamId } });
      await client.topic.deleteMany({ where: { programId } });
      await client.projectProgram.deleteMany({ where: { id: programId } });
      await client.user.deleteMany({ where: { id: adminId } });
    };

    await cleanup();
    try {
      await client.user.create({
        data: { id: adminId, name: "갤러리 검증 관리자", email: `admin-${suffix}@pusan.ac.kr`, role: "ADMIN" },
      });
      await client.projectProgram.create({
        data: {
          id: programId,
          name: `갤러리 검증 프로그램 ${suffix}`,
          category: "갤러리 검증",
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
              { id: topicId, authorId: adminId, title: "갤러리 검증 주제", description: "설명", capacity: 4, status: "ACTIVE", publishedAt: past },
            ],
          },
        },
      });
      await client.projectTeam.create({
        data: { id: teamId, projectId: topicId, name: `갤러리 검증 팀 ${suffix}`, confirmedAt: past },
      });

      const repository = new PrismaArtifactRepository(client);
      const actor = { id: adminId, role: "ADMIN" as const, name: "갤러리 검증 관리자", email: `admin-${suffix}@pusan.ac.kr`, image: null };

      for (const index of [0, 1, 2]) {
        await repository.registerArtifact({
          teamId,
          actor,
          type: "IMAGE",
          title: `사진 ${index}`,
          externalUrl: `https://example.com/${index}.png`,
          createdAt: new Date(),
        });
      }

      const images = await client.artifact.findMany({
        where: { projectTeamId: teamId, type: "IMAGE" },
        orderBy: { createdAt: "asc" },
        select: { title: true, position: true },
      });
      // 나중에 올린 사진일수록 뒤 자리를 받아야 갤러리에서 맨 뒤에 붙는다.
      expect(images.map(({ position }) => position)).toEqual([0, 1, 2]);

      await client.storedFile.create({
        data: {
          id: thumbnailFileId,
          projectTeamId: teamId,
          ownerId: adminId,
          purpose: "ARTIFACT",
          consumer: "ARTIFACT",
          status: "READY",
          readyAt: past,
          objectKey: `objects/${thumbnailFileId}`,
          uploadObjectKey: `staging/${thumbnailFileId}`,
          originalName: "cover.png",
          contentType: "image/png",
          size: 1024,
          sha256: "0".repeat(64),
          expiresAt: future,
          // 정리 시각은 만료보다 하루 뒤여야 한다는 제약이 있다.
          cleanupAfter: new Date(future.getTime() + 2 * 86_400_000),
        },
      });

      expect(await repository.setThumbnail({ teamId, actor, fileId: thumbnailFileId, updatedAt: new Date() })).toBe(true);
      expect(await repository.setThumbnail({ teamId, actor, fileId: null, updatedAt: new Date() })).toBe(true);

      const topic = await client.topic.findUniqueOrThrow({ where: { id: topicId }, select: { thumbnailPath: true } });
      expect(topic.thumbnailPath).toBeNull();
      // 화면에서 내린 이미지는 파일까지 사라져야 한다. 남으면 주소를 아는 사람에게 계속 열린다.
      expect(await client.storedFile.findUnique({ where: { id: thumbnailFileId } })).toBeNull();
    } finally {
      await cleanup();
    }
  }, 30_000);
});
