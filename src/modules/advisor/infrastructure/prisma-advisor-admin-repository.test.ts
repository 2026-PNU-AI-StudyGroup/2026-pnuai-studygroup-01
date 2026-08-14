import { describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaAdvisorAdminRepository } from "@/modules/advisor/infrastructure/prisma-advisor-admin-repository";

function uniqueConflict() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.8.0",
    meta: { target: ["email"] },
  });
}

describe("PrismaAdvisorAdminRepository.registerAdvisor", () => {
  it("동시 등록 레이스(P2002)로 create가 실패하면 재조회해 ADVISOR면 재사용한다", async () => {
    const client = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null) // 최초 조회: 없음
          .mockResolvedValueOnce({ id: "adv-1", role: "ADVISOR" }), // 레이스 후 재조회
        create: vi.fn().mockRejectedValue(uniqueConflict()),
      },
    } as unknown as PrismaClient;
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.registerAdvisor({ name: "김위원", email: "advisor@example.com" }))
      .resolves.toEqual({ userId: "adv-1" });
  });

  it("레이스 후 재조회한 사용자가 ADVISOR가 아니면 거부한다", async () => {
    const client = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "stu-1", role: "STUDENT" }),
        create: vi.fn().mockRejectedValue(uniqueConflict()),
      },
    } as unknown as PrismaClient;
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.registerAdvisor({ name: "김위원", email: "student@example.com" }))
      .resolves.toBeNull();
  });
});
