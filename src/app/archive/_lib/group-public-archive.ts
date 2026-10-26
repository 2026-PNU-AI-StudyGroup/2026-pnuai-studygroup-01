import { orderProgramSidebarCategories } from "@/modules/project-program/ui/program-sidebar-items";
import type { PublicArchivedProject } from "@/modules/team/application/archive-projects";

export type PublicArchiveProgram = { id: string; name: string; projects: PublicArchivedProject[] };
export type PublicArchiveYear = { year: number; programs: PublicArchiveProgram[] };
export type PublicArchiveView = {
  categories: Array<{ name: string; count: number }>;
  selectedCategory: string | null;
  years: PublicArchiveYear[];
  totalProjects: number;
};

/**
 * 아카이브 탭 차례. 현장평가에서 보여 줄 차례를 실장님이 정했다(2026-10-26): 해커톤, 카카오테크 캠퍼스,
 * 졸업과제, AI 부스터. 대분류 이름은 운영자가 바꿀 수 있어 낱말로 맞춘다. 졸업과제는 대분류가 아니라
 * 고정 탭이라 null 로 자리만 잡는다. 여기 없는 사업은 사이드바 대분류 차례로 뒤에 붙는다.
 */
export const ARCHIVE_TAB_ORDER: ReadonlyArray<RegExp | null> = [/해커톤/, /카카오\s*테크|카테캠/, null, /부스터/];

function archiveTabRank(category: string): number {
  const rank = ARCHIVE_TAB_ORDER.findIndex((pattern) => pattern?.test(category));
  return rank === -1 ? ARCHIVE_TAB_ORDER.length : rank;
}

/** 졸업과제 탭 앞에 오는 사업 탭 수. 졸업과제 탭을 끼워 넣을 자리다. */
export function graduationTabIndex(categories: ReadonlyArray<{ name: string }>): number {
  const graduationRank = ARCHIVE_TAB_ORDER.indexOf(null);
  return categories.filter(({ name }) => archiveTabRank(name) < graduationRank).length;
}

/**
 * 공개 아카이브 화면 하나를 세운다.
 *
 * 사업(대분류) 탭은 ARCHIVE_TAB_ORDER 차례가 먼저고, 나머지는 운영자가 정한 사이드바 차례를 따른다.
 * 탭을 고르지 않았거나 없는 이름이면 첫 탭을 연다.
 * 탭 안은 연도 내림차순, 그 안은 프로그램별이다. 프로젝트 차례는 조회가 정한 것을 그대로 둔다.
 */
export function groupPublicArchive(
  projects: readonly PublicArchivedProject[],
  categoryOrder: readonly string[],
  requestedCategory: string | undefined,
): PublicArchiveView {
  // 사이드바 차례로 먼저 세우고, 아카이브 차례로 다시 세운다. 정렬이 안정적이라 같은 자리끼리는 앞 차례를 지킨다.
  const names = orderProgramSidebarCategories(
    projects.map((project) => ({ category: project.programCategory })),
    categoryOrder,
  ).sort((left, right) => archiveTabRank(left) - archiveTabRank(right));
  const categories = names.map((name) => ({
    name,
    count: projects.filter((project) => project.programCategory === name).length,
  }));
  const selectedCategory = requestedCategory && names.includes(requestedCategory) ? requestedCategory : names[0] ?? null;

  const years = new Map<number, Map<string, PublicArchiveProgram>>();
  for (const project of projects) {
    if (project.programCategory !== selectedCategory) continue;
    const programs = years.get(project.startYear) ?? new Map<string, PublicArchiveProgram>();
    const program = programs.get(project.programId) ?? { id: project.programId, name: project.programName, projects: [] };
    program.projects.push(project);
    programs.set(project.programId, program);
    years.set(project.startYear, programs);
  }

  return {
    categories,
    selectedCategory,
    years: [...years]
      .sort(([left], [right]) => right - left)
      .map(([year, programs]) => ({ year, programs: [...programs.values()] })),
    totalProjects: projects.length,
  };
}
