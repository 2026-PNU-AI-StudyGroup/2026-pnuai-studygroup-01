import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectAssistantRepository } from "@/modules/project-assistant/infrastructure/prisma-project-assistant-repository";

describe("PrismaProjectAssistantRepository 계정 상태", () => {
  it("비활성 계정은 프로젝트 조교로 초대하지 않는다", async () => {
    const findUnique = vi.fn(async () => ({ id: "assistant-1", accountStatus: "DISABLED" }));
    const transaction = {
      $executeRaw: vi.fn(async () => 1),
      $queryRaw: vi.fn(async () => [{
        managerId: "professor-1",
        title: "프로젝트",
        advisorEnabled: true,
      }]),
      user: { findUnique },
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaProjectAssistantRepository(client).invite({
      topicId: "project-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      email: "assistant@example.com",
      invitedAt: new Date("2026-08-13T00:00:00.000Z"),
    })).resolves.toBe("INACTIVE");

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "assistant@example.com" },
      select: { id: true, accountStatus: true },
    });
  });
});
