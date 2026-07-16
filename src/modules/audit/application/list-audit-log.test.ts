import { describe, expect, it, vi } from "vitest";

import { AuditLogForbiddenError, ListAuditLogService, type AuditLogReader } from "@/modules/audit/application/list-audit-log";

describe("감사 기록 조회", () => {
  it("관리자만 감사 기록을 조회한다", async () => {
    const reader = { list: vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 1, total: 0 }) } satisfies AuditLogReader;
    await expect(new ListAuditLogService(reader).execute({ id: "admin-1", role: "ADMIN" })).resolves.toEqual(expect.objectContaining({ total: 0 }));
    expect(reader.list).toHaveBeenCalledWith(1, 50);
  });

  it("학생의 조회를 거절한다", () => {
    expect(() => new ListAuditLogService({} as AuditLogReader).execute({ id: "student-1", role: "STUDENT" })).toThrow(AuditLogForbiddenError);
  });
});
