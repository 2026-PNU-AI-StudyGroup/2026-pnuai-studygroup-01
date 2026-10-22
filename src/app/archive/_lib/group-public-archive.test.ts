import { describe, expect, it } from "vitest";

import { groupPublicArchive } from "@/app/archive/_lib/group-public-archive";
import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";

function project(overrides: Partial<PublicArchivedProject>): PublicArchivedProject {
  return {
    id: "t", programId: "p", programName: "프로그램", programCategory: "해커톤", startYear: 2024,
    teamName: "팀", teamNumber: null, title: "제목", description: "", award: null, repositoryUrl: null,
    ...overrides,
  };
}

describe("공개 아카이브 묶기", () => {
  // 조회가 정한 차례(최근 프로그램 먼저)로 들어온다.
  const projects = [
    project({ id: "a", programId: "h7", programName: "제7회", startYear: 2026 }),
    project({ id: "b", programId: "h5", programName: "제5회", startYear: 2024 }),
    project({ id: "c", programId: "h5", programName: "제5회", startYear: 2024 }),
    project({ id: "d", programId: "b25", programName: "AI 부스터 2025", programCategory: "AI 부스터", startYear: 2025 }),
  ];

  it("운영자가 정한 차례로 탭을 세우고 첫 탭을 연다", () => {
    const view = groupPublicArchive(projects, ["AI 부스터", "해커톤"], undefined);
    expect(view.categories).toEqual([{ name: "AI 부스터", count: 1 }, { name: "해커톤", count: 3 }]);
    expect(view.selectedCategory).toBe("AI 부스터");
    expect(view.totalProjects).toBe(4);
  });

  it("고른 탭 안을 연도 내림차순, 프로그램별로 묶는다", () => {
    const view = groupPublicArchive(projects, ["AI 부스터", "해커톤"], "해커톤");
    expect(view.years.map(({ year, programs }) => [
      year,
      programs.map(({ name, projects: items }) => [name, items.map(({ id }) => id)]),
    ])).toEqual([
      [2026, [["제7회", ["a"]]]],
      [2024, [["제5회", ["b", "c"]]]],
    ]);
  });

  it("없는 탭 이름이면 첫 탭을 연다", () => {
    expect(groupPublicArchive(projects, ["AI 부스터", "해커톤"], "없는 사업").selectedCategory).toBe("AI 부스터");
  });

  it("공개된 프로젝트가 없으면 빈 화면이다", () => {
    expect(groupPublicArchive([], [], undefined)).toEqual({ categories: [], selectedCategory: null, years: [], totalProjects: 0 });
  });
});
