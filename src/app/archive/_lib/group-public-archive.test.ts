import { describe, expect, it } from "vitest";

import { graduationTabIndex, groupPublicArchive } from "@/app/archive/_lib/group-public-archive";
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

  it("사이드바 차례보다 아카이브 차례(해커톤이 부스터보다 먼저)를 따르고 첫 탭을 연다", () => {
    const view = groupPublicArchive(projects, ["AI 부스터", "해커톤"], undefined);
    expect(view.categories).toEqual([{ name: "해커톤", count: 3 }, { name: "AI 부스터", count: 1 }]);
    expect(view.selectedCategory).toBe("해커톤");
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
    expect(groupPublicArchive(projects, ["AI 부스터", "해커톤"], "없는 사업").selectedCategory).toBe("해커톤");
  });

  it("아카이브 탭은 해커톤, 카카오테크 캠퍼스, 졸업과제, AI 부스터 차례이고 나머지는 뒤에 붙는다", () => {
    const named = (programCategory: string) => ({ ...projects[0], id: programCategory, programId: programCategory, programCategory });
    // 사이드바 차례는 부스터가 해커톤보다 앞이고 카테캠은 차례에 없다(운영 데이터 모양).
    const view = groupPublicArchive(
      [named("PNU AI 부스터"), named("학습공동체"), named("카카오테크 캠퍼스"), named("PNU 창의융합AI해커톤")],
      ["학습공동체", "PNU AI 부스터", "PNU 창의융합AI해커톤"],
      undefined,
    );

    expect(view.categories.map(({ name }) => name)).toEqual(["PNU 창의융합AI해커톤", "카카오테크 캠퍼스", "PNU AI 부스터", "학습공동체"]);
    expect(view.selectedCategory).toBe("PNU 창의융합AI해커톤");
    // 졸업과제 탭은 해커톤과 카테캠 다음, 부스터 앞에 들어간다.
    expect(graduationTabIndex(view.categories)).toBe(2);
  });

  it("공개된 프로젝트가 없으면 빈 화면이다", () => {
    expect(groupPublicArchive([], [], undefined)).toEqual({ categories: [], selectedCategory: null, years: [], totalProjects: 0 });
  });
});
