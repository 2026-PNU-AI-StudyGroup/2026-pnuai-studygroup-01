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
 * 공개 아카이브 화면 하나를 세운다.
 *
 * 사업(대분류) 탭은 운영자가 정한 차례를 따른다. 사이드바와 같은 함수를 써서 두 화면의
 * 차례가 어긋나지 않게 한다. 탭을 고르지 않았거나 없는 이름이면 첫 탭을 연다.
 * 탭 안은 연도 내림차순, 그 안은 프로그램별이다. 프로젝트 차례는 조회가 정한 것을 그대로 둔다.
 */
export function groupPublicArchive(
  projects: readonly PublicArchivedProject[],
  categoryOrder: readonly string[],
  requestedCategory: string | undefined,
): PublicArchiveView {
  const names = orderProgramSidebarCategories(
    projects.map((project) => ({ category: project.programCategory })),
    categoryOrder,
  );
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
