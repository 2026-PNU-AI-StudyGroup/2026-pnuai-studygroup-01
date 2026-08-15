import { describe, expect, it, vi } from "vitest";

import {
  AdminProgramProjectOperationsForbiddenError,
  ListAdminProgramProjectOperationsService,
  parseAdminProjectOperationFilter,
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

    const result = await service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", "all");

    expect(result.summary).toEqual({
      total: 4,
      operating: 3,
      unassigned: 1,
      overdue: 1,
      submitted: 1,
    });
    expect(result.matchingTopicIds).toEqual(records.map(({ topicId }) => topicId));
  });

  it("선택한 운영 상태의 프로젝트 ID만 목록 조회에 전달한다", async () => {
    const reader: AdminProgramProjectOperationsReader = { listByProgram: vi.fn().mockResolvedValue(records) };
    const service = new ListAdminProgramProjectOperationsService(reader, () => new Date("2026-08-13T00:00:00Z"));

    await expect(service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", "overdue"))
      .resolves.toMatchObject({ matchingTopicIds: ["topic-overdue"] });
    await expect(service.execute({ id: "admin-1", role: "ADMIN" }, "program-1", "submitted"))
      .resolves.toMatchObject({ matchingTopicIds: ["topic-submitted"] });
  });

  it("관리자가 아니면 운영 요약 조회를 거부한다", async () => {
    const reader: AdminProgramProjectOperationsReader = { listByProgram: vi.fn() };
    const service = new ListAdminProgramProjectOperationsService(reader);

    await expect(service.execute({ id: "student-1", role: "STUDENT" }, "program-1", "all"))
      .rejects.toBeInstanceOf(AdminProgramProjectOperationsForbiddenError);
    expect(reader.listByProgram).not.toHaveBeenCalled();
  });
});

describe("parseAdminProjectOperationFilter", () => {
  it("허용된 값만 사용하고 나머지는 전체로 정규화한다", () => {
    expect(parseAdminProjectOperationFilter("submitted")).toBe("submitted");
    expect(parseAdminProjectOperationFilter("unknown")).toBe("all");
    expect(parseAdminProjectOperationFilter(undefined)).toBe("all");
  });
});
