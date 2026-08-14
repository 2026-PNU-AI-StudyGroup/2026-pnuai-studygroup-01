import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";

describe("PrismaProfessorAccessRepository", () => {
  it("이미 활성인 교수 허용 목록은 새 알림·이메일·감사 기록을 만들지 않는다", async () => {
    const transaction = {
      $queryRaw: vi.fn(async () => []),
      professorAllowlist: {
        findUnique: vi.fn(async () => ({ id: "allowlist-1", revokedAt: null })),
        upsert: vi.fn(),
      },
      user: { updateMany: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
      notification: { create: vi.fn() },
      emailDelivery: { createMany: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;

    await new PrismaProfessorAccessRepository(client).grant("professor@pusan.ac.kr", "admin-1");

    expect(transaction.professorAllowlist.upsert).not.toHaveBeenCalled();
    expect(transaction.notification.create).not.toHaveBeenCalled();
    expect(transaction.emailDelivery.createMany).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("새 교수 권한 부여는 하나의 감사 이벤트 ID를 알림과 이메일 idempotency key에 사용한다", async () => {
    const notificationCreate = vi.fn(async () => ({ id: "notification-1" }));
    const emailCreateMany = vi.fn(async () => ({ count: 1 }));
    const auditCreate = vi.fn(async () => ({ id: "audit-1" }));
    const transaction = {
      $queryRaw: vi.fn(async () => []),
      professorAllowlist: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async () => ({ id: "allowlist-1" })),
      },
      user: {
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => ({ id: "professor-1" })),
        findMany: vi.fn(async () => [{
          id: "professor-1",
          email: "professor@pusan.ac.kr",
          emailVerified: true,
          accountStatus: "ACTIVE" as const,
          preferredLocale: "ko",
          emailPreference: null,
        }]),
      },
      notification: { create: notificationCreate },
      emailDelivery: { createMany: emailCreateMany },
      auditLog: { create: auditCreate },
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;

    await new PrismaProfessorAccessRepository(client).grant("professor@pusan.ac.kr", "admin-1");

    const auditId = auditCreate.mock.calls[0]?.[0].data.id as string;
    expect(auditId).toEqual(expect.any(String));
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ dedupeKey: `professor-access-granted:${auditId}` }),
    }));
    expect(emailCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ idempotencyKey: `email:professor-access-granted:${auditId}` })],
      skipDuplicates: true,
    }));
  });
});
