import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaReportDecisionRepository } from "@/modules/report/infrastructure/prisma-report-decision-repository";

describe("PrismaReportDecisionRepository", () => {
  it("프로그램 종료 뒤에는 관리자 외 보고서 결정을 SQL 권한 경계에서 차단한다", async () => {
    const queryRaw = vi.fn(async (query: unknown) => {
      void query;
      return [];
    });
    const transaction = {
      $executeRaw: vi.fn(async () => 1),
      $queryRaw: queryRaw,
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;
    const decidedAt = new Date("2026-08-13T00:00:00.000Z");

    await expect(new PrismaReportDecisionRepository(client).decide({
      reportVersionId: "report-version-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      decision: "APPROVED",
      comment: "승인합니다.",
      decidedAt,
    })).resolves.toBe(false);

    const authorizationSql = (queryRaw.mock.calls[0][0] as { strings: readonly string[] })
      .strings.join("?");
    expect(authorizationSql).toContain('JOIN "project_program"');
    expect(authorizationSql).toContain('"project_program"."endsAt" >');
    expect(authorizationSql).toContain('::"UserRole" = \'ADMIN\' OR');
  });
});
