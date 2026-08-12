import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTopicCommandRepository } from "@/modules/topic/infrastructure/prisma-topic-command-repository";

describe("Prisma 주제 저장소", () => {
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
      auditLog: { create: vi.fn(async () => ({ id: "audit-1" })) },
    };
    const client = { $transaction: vi.fn(async (operation) => operation(transaction)) } as unknown as PrismaClient;

    await expect(new PrismaTopicCommandRepository(client).closePublished(
      "topic-1",
      { id: "professor-1", role: "PROFESSOR" },
    )).resolves.toBe(true);

    expect(order).toEqual(["topic-closed", "applications-read"]);
    expect(transaction.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        actorId: "professor-1",
        action: "TOPIC_CLOSED",
        targetType: "TOPIC",
        targetId: "topic-1",
      }),
    }));
  });
});
