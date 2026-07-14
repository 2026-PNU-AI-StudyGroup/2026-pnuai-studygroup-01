import { describe, expect, it, vi } from "vitest";

import {
  CreateYearlyBackupService,
  InvalidAcademicYearError,
} from "@/modules/backup/application/create-yearly-backup";

describe("연도별 결과물 백업", () => {
  it("종료된 해당 학년도 프로젝트를 백업 writer에 전달한다", async () => {
    const projects = [{
      id: "team-1",
      term: "FIRST" as const,
      teamName: "팀",
      topicTitle: "주제",
      topicDescription: "설명",
      professorName: "교수",
      memberNames: ["학생"],
      artifacts: [],
    }];
    const catalog = { listClosedProjects: vi.fn(async () => projects) };
    const writer = { write: vi.fn(async () => ({ directory: "/backup", fileCount: 0 })) };
    const createdAt = new Date("2026-12-31T15:00:00.000Z");

    await expect(new CreateYearlyBackupService(catalog, writer).execute(2026, createdAt))
      .resolves.toEqual({ directory: "/backup", fileCount: 0, projectCount: 1 });
    expect(catalog.listClosedProjects).toHaveBeenCalledWith(2026);
    expect(writer.write).toHaveBeenCalledWith({ academicYear: 2026, createdAt, projects });
  });

  it.each([1999, 2101, 2026.5, Number.NaN])("유효하지 않은 학년도 %s를 거부한다", async (year) => {
    const catalog = { listClosedProjects: vi.fn() };
    const writer = { write: vi.fn() };
    await expect(new CreateYearlyBackupService(catalog, writer).execute(year))
      .rejects.toBeInstanceOf(InvalidAcademicYearError);
    expect(catalog.listClosedProjects).not.toHaveBeenCalled();
  });
});
