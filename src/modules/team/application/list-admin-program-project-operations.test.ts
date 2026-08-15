import { describe, expect, it, vi } from "vitest";

import {
  AdminProgramProjectOperationsForbiddenError,
  ListAdminProgramProjectOperationsService,
  parseAdminProjectOperationFilters,
  type AdminProgramProjectOperationsReader,
} from "@/modules/team/application/list-admin-program-project-operations";

const records = [
  { topicId: "topic-unassigned", team: null },
  { topicId: "topic-unscheduled", team: { reports: [] } },
  { topicId: "topic-overdue", team: { reports: [{ dueAt: new Date("2026-08-01T00:00:00Z"), submitted: false }] } },
  { topicId: "topic-submitted", team: { reports: [{ dueAt: new Date("2026-08-01T00:00:00Z"), submitted: true }] } },
];

describe("ListAdminProgramProjectOperationsService", () => {
  it("프로그램 전체 프로젝트를 팀과 필수 보고서 상태로 집계한다", async () => {
    const reader: AdminProgramProjectOperationsReader = { listByProgram: vi.fn().mockResolvedValue(records) };
    const service = new ListAdminProgramProjectOperationsService(reader, () => new Date("2026-08-13T00:00:00Z"));

    const result = await service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", { team: "all", report: "all" });

    expect(result.summary).toEqual({
      total: 4,
      formed: 3,
      unassigned: 1,
      overdue: 1,
      submitted: 1,
    });
    expect(result.matchingTopicIds).toEqual(records.map(({ topicId }) => topicId));
  });

  it("팀 구성과 보고서 조건을 함께 만족하는 프로젝트 ID만 목록 조회에 전달한다", async () => {
    const reader: AdminProgramProjectOperationsReader = { listByProgram: vi.fn().mockResolvedValue(records) };
    const service = new ListAdminProgramProjectOperationsService(reader, () => new Date("2026-08-13T00:00:00Z"));

    await expect(service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", { team: "formed", report: "overdue" }))
      .resolves.toMatchObject({ matchingTopicIds: ["topic-overdue"] });
    await expect(service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", { team: "unassigned", report: "submitted" }))
      .resolves.toMatchObject({ matchingTopicIds: [] });
    await expect(service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", { team: "all", report: "submitted" }))
      .resolves.toMatchObject({ matchingTopicIds: ["topic-submitted"] });
  });

  it("선택한 분과 범위에서만 집계한다", async () => {
    const listByProgram = vi.fn().mockResolvedValue(records);
    const service = new ListAdminProgramProjectOperationsService({ listByProgram }, () => new Date("2026-08-13T00:00:00Z"));

    await service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", { team: "all", report: "all" }, "division-1");

    expect(listByProgram).toHaveBeenCalledWith("program-1", "division-1");
  });

  it("관리자가 아니면 운영 요약 조회를 거부한다", async () => {
    const reader: AdminProgramProjectOperationsReader = { listByProgram: vi.fn() };
    const service = new ListAdminProgramProjectOperationsService(reader);

    await expect(service.execute({ id: "student-1", role: "STUDENT" }, "program-1", { team: "all", report: "all" }))
      .rejects.toBeInstanceOf(AdminProgramProjectOperationsForbiddenError);
    expect(reader.listByProgram).not.toHaveBeenCalled();
  });
});

describe("parseAdminProjectOperationFilters", () => {
  it("두 축을 독립적으로 읽고, 이전 단일 operation 링크도 정규화한다", () => {
    expect(parseAdminProjectOperationFilters({ teamStatus: "formed", reportStatus: "submitted" }))
      .toEqual({ team: "formed", report: "submitted" });
    expect(parseAdminProjectOperationFilters({ operation: "overdue" }))
      .toEqual({ team: "all", report: "overdue" });
    expect(parseAdminProjectOperationFilters({ teamStatus: "unknown", reportStatus: "unknown" }))
      .toEqual({ team: "all", report: "all" });
  });
});
