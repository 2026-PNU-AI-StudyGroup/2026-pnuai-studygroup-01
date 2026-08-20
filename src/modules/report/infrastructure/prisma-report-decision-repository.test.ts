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

  it("반려 사유를 관리 이력에 함께 남긴다", async () => {
    // 예전에는 사유가 approval_decision 행에만 있어서 관리 이력 화면에서 볼 수 없었다.
    const auditCreate = vi.fn(async () => ({ id: "audit-1" }));
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ id: "team-1", name: "모두의 길", projectId: "topic-1" }])
      .mockResolvedValueOnce([{ id: "report-version-1" }]);
    const transaction = {
      $executeRaw: vi.fn(async () => 1),
      $queryRaw: queryRaw,
      approvalDecision: { create: vi.fn(async () => ({ id: "decision-1" })) },
      reportVersion: { findUnique: vi.fn(async () => ({ version: 2, report: { titleSnapshot: "중간 보고서" } })) },
      projectTeamMembership: { findMany: vi.fn(async () => [{ userId: "student-1" }]) },
      notification: { createMany: vi.fn(async () => ({ count: 1 })) },
      user: { findMany: vi.fn(async () => []) },
      emailDelivery: { createMany: vi.fn(async () => ({ count: 0 })) },
      auditLog: { create: auditCreate },
    };
    const client = {
      $transaction: vi.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaReportDecisionRepository(client).decide({
      reportVersionId: "report-version-1",
      actor: { id: "admin-1", role: "ADMIN" },
      decision: "REVISION_REQUESTED",
      comment: "표지 양식을 맞춰 주세요.",
      decidedAt: new Date("2026-08-20T00:00:00.000Z"),
    })).resolves.toBe(true);

    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "REPORT_REVISION_REQUESTED",
      metadata: expect.objectContaining({ reviewComment: "표지 양식을 맞춰 주세요." }),
    }) });
  });
});
