import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicCommandRepository } from "@/modules/topic/infrastructure/prisma-topic-command-repository";

describe("Prisma 주제 저장소", () => {
  it("공개 상태와 모집 종료 시각을 하나의 조건부 갱신으로 검사한다", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const transaction = { $queryRaw: vi.fn(async () => [{ id: "program-1" }]), topic: { updateMany } };
    const client = { $transaction: vi.fn(async (operation) => operation(transaction)) } as unknown as PrismaClient;
    const repository = new PrismaTopicCommandRepository(client);
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
        applicationQuestions: { some: {} },
      },
      data: { status: "PUBLISHED", publishedAt },
    });
  });

  it("주제를 잠가 마감한 뒤 실제 대기 지원서만 거절 대상으로 조회한다", async () => {
    const order: string[] = [];
    const transaction = {
      topic: { updateMany: vi.fn(async () => { order.push("topic-closed"); return { count: 1 }; }) },
      topicApplication: {
        findMany: vi.fn(async () => { order.push("applications-read"); return []; }),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
      recruitmentPost: { updateMany: vi.fn(async () => ({ count: 0 })) },
      recruitmentApplication: { updateMany: vi.fn(async () => ({ count: 0 })) },
      notification: { createMany: vi.fn(async () => ({ count: 0 })) },
    };
    const client = { $transaction: vi.fn(async (operation) => operation(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicCommandRepository(client).closePublished("topic-1")).resolves.toBe(true);

    expect(order).toEqual(["topic-closed", "applications-read"]);
  });
});
