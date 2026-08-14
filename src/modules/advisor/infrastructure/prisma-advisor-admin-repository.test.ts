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

// 등록은 user.create와 감사로그를 한 트랜잭션에서 처리하므로 콜백을 그대로 실행하는 목을 쓴다.
function clientWithRacingCreate(racedUser: { id: string; role: string } | null) {
  const user = {
    findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(racedUser),
    create: vi.fn().mockRejectedValue(uniqueConflict()),
  };
  const auditLog = { create: vi.fn().mockResolvedValue({}) };
  return {
    user,
    auditLog,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({ user, auditLog })),
  } as unknown as PrismaClient;
}

describe("PrismaAdvisorAdminRepository.registerAdvisor", () => {
  it("동시 등록 레이스(P2002)로 create가 실패하면 재조회해 ADVISOR면 재사용한다", async () => {
    const repository = new PrismaAdvisorAdminRepository(clientWithRacingCreate({ id: "adv-1", role: "ADVISOR" }));

    await expect(repository.registerAdvisor({ name: "김위원", email: "advisor@example.com", actorId: "admin-1" }))
      .resolves.toEqual({ userId: "adv-1" });
  });

  it("레이스 후 재조회한 사용자가 ADVISOR가 아니면 거부한다", async () => {
    const repository = new PrismaAdvisorAdminRepository(clientWithRacingCreate({ id: "stu-1", role: "STUDENT" }));

    await expect(repository.registerAdvisor({ name: "김위원", email: "student@example.com", actorId: "admin-1" }))
      .resolves.toBeNull();
  });

  it("등록에 성공하면 감사 로그를 남긴다", async () => {
    const user = { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "adv-9" }) };
    const auditLog = { create: vi.fn().mockResolvedValue({}) };
    const client = {
      user,
      auditLog,
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({ user, auditLog })),
    } as unknown as PrismaClient;
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.registerAdvisor({ name: "김위원", email: "advisor@example.com", actorId: "admin-1" }))
      .resolves.toEqual({ userId: "adv-9" });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: "admin-1", action: "ADVISOR_REGISTERED", targetId: "adv-9" }),
    });
  });
});
