import type { ProgramSidebarItem } from "@/app/topics/_components/program-sidebar";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { ArchivedProgramOption } from "@/modules/team/application/archive-projects";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

export type ProgramSidebarQuery = {
  query?: string;
  phase?: PublicTopicPhase;
  sort?: PublicTopicSort;
};

function programHref(
  programId: string,
  target: "active" | "past",
  query: ProgramSidebarQuery,
) {
  const params = new URLSearchParams();
  if (target === "past") params.set("view", "past");
  params.set("programId", programId);
  if (query.query) params.set("q", query.query);
  if (target === "active" && query.phase) params.set("phase", query.phase);
  if (target === "active" && query.sort === "DEADLINE") params.set("sort", query.sort);
  return `/topics?${params.toString()}`;
}

export function buildProgramSidebarItems(
  openPrograms: ProjectProgramRecord[],
  archivedPrograms: ArchivedProgramOption[],
  view: "active" | "past" = "active",
  query: ProgramSidebarQuery = {},
): ProgramSidebarItem[] {
  if (view === "past") {
    const archivedIds = new Set(archivedPrograms.map((program) => program.id));
    return [
      ...archivedPrograms.map((program) => ({
        ...program,
        status: "past" as const,
        href: programHref(program.id, "past", query),
      })),
      ...openPrograms
        .filter((program) => !archivedIds.has(program.id))
        .map((program) => ({
          id: program.id,
          name: program.name,
          category: program.category,
          icon: program.icon,
          startYear: program.startYear,
          status: "active" as const,
          href: programHref(program.id, "active", query),
        })),
    ];
  }

  const activeIds = new Set(openPrograms.map((program) => program.id));
  return [
    ...openPrograms.map((program) => ({
      id: program.id,
      name: program.name,
      category: program.category,
      icon: program.icon,
      startYear: program.startYear,
      status: "active" as const,
      href: programHref(program.id, "active", query),
    })),
    ...archivedPrograms
      .filter((program) => !activeIds.has(program.id))
      .map((program) => ({
        ...program,
        status: "past" as const,
        href: programHref(program.id, "past", query),
      })),
  ];
}
