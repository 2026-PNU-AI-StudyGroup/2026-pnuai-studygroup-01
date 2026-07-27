import type { ProgramSidebarItem } from "@/app/topics/_components/program-sidebar";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { ArchivedProgramOption } from "@/modules/team/application/archive-projects";

export function buildProgramSidebarItems(
  openPrograms: ProjectProgramRecord[],
  archivedPrograms: ArchivedProgramOption[],
): ProgramSidebarItem[] {
  const activeIds = new Set(openPrograms.map((program) => program.id));
  return [
    ...openPrograms.map((program) => ({
      id: program.id,
      name: program.name,
      category: program.category,
      academicYear: program.academicYear,
      status: "active" as const,
      href: `/topics?programId=${encodeURIComponent(program.id)}`,
    })),
    ...archivedPrograms
      .filter((program) => !activeIds.has(program.id))
      .map((program) => ({
        ...program,
        status: "past" as const,
        href: `/topics?view=past&programId=${encodeURIComponent(program.id)}`,
      })),
  ];
}
