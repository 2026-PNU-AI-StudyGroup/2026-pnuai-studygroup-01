import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";

describe("Prisma 주제 저장소", () => {
  it("공개 상태와 모집 종료 시각을 하나의 조건부 갱신으로 검사한다", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const transaction = { $queryRaw: vi.fn(async () => [{ id: "program-1" }]), topic: { updateMany } };
    const client = { $transaction: vi.fn(async (operation) => operation(transaction)) } as unknown as PrismaClient;
    const repository = new PrismaTopicRepository(client);
    const publishedAt = new Date("2026-03-10T00:00:00Z");

    await expect(repository.publishDraft("topic-1", publishedAt)).resolves.toBe(
      false,
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "topic-1",
        status: "DRAFT",
        recruitmentEndsAt: { gt: publishedAt },
        requiredSkills: { isEmpty: false },
        roleExpectations: { not: "" },
        availabilityRequirement: { not: "" },
      },
      data: { status: "PUBLISHED", publishedAt },
    });
  });
});
