import { describe, expect, it, vi } from "vitest";

import {
  AdminProjectOverviewForbiddenError,
  ListAdminProjectOverviewService,
} from "@/modules/team/application/list-admin-project-overview";

describe("관리자 프로젝트 현황 조회", () => {
  it("관리자는 프로그램별 프로젝트 현황을 조회한다", async () => {
    const programs = [{
      id: "program-1",
      name: "캡스톤",
      category: "교과",
      academicYear: 2026,
      term: "FIRST" as const,
      status: "OPEN" as const,
      advisorEnabled: true,
      projects: [],
    }];
    const reader = { listByProgram: vi.fn().mockResolvedValue(programs) };

    await expect(new ListAdminProjectOverviewService(reader).execute({
      id: "admin-1",
      role: "ADMIN",
    })).resolves.toEqual(programs);
  });

  it("관리자가 아닌 사용자의 전체 현황 조회를 거부한다", async () => {
    const reader = { listByProgram: vi.fn() };

    await expect(new ListAdminProjectOverviewService(reader).execute({
      id: "professor-1",
      role: "PROFESSOR",
    })).rejects.toBeInstanceOf(AdminProjectOverviewForbiddenError);
    expect(reader.listByProgram).not.toHaveBeenCalled();
  });
});
