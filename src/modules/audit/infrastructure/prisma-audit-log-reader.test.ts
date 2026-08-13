import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaAuditLogReader } from "@/modules/audit/infrastructure/prisma-audit-log-reader";

function client(entries: unknown[]) {
  return {
    auditLog: { count: vi.fn().mockResolvedValue(entries.length), findMany: vi.fn().mockResolvedValue(entries) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    projectTeam: { findMany: vi.fn().mockResolvedValue([]) },
    topic: { findMany: vi.fn().mockResolvedValue([]) },
    programDivision: { findMany: vi.fn().mockResolvedValue([]) },
    projectProgram: { findMany: vi.fn().mockResolvedValue([{ id: "program-1", name: "캡스톤" }]) },
  } as unknown as PrismaClient;
}

describe("PrismaAuditLogReader", () => {
  it("삭제된 분과와 프로그램 투표 초기화를 식별 가능한 대상으로 표시한다", async () => {
    const page = await new PrismaAuditLogReader(client([
      { id: "audit-1", action: "PROGRAM_DIVISION_DELETED", targetType: "PROGRAM_DIVISION", targetId: "division-1", metadata: { name: "창업" }, createdAt: new Date(), actor: { name: "관리자" } },
      { id: "audit-2", action: "PROGRAM_VOTING_RESET", targetType: "PROJECT_PROGRAM", targetId: "program-1", metadata: {}, createdAt: new Date(), actor: { name: "관리자" } },
    ])).list(1, 20);

    expect(page.items.map(({ targetLabel }) => targetLabel)).toEqual(["창업", "캡스톤"]);
  });
});
