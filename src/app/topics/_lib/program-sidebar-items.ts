import type { ProgramSidebarItem } from "@/app/topics/_components/program-sidebar";
import { programLifecycleStatus, type ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import { isProgramVotingOpen } from "@/modules/project-program/domain/project-program-policy";
import type { ArchivedProgramOption } from "@/modules/team/application/archive-projects";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";

export type ProgramSidebarQuery = {
  query?: string;
  phase?: PublicTopicPhase;
  sort?: PublicTopicSort;
};

function activeVotingEndsAt(program: ProjectProgramRecord | undefined, now: Date) {
  if (!isProgramVotingOpen(program?.votingPolicy, now)) return undefined;
  return program?.votingPolicy?.endsAt;
}

function visibleProgramSidebarItem(
  program: ProjectProgramRecord,
  query: ProgramSidebarQuery,
  now: Date,
): ProgramSidebarItem {
  const status = programLifecycleStatus(program) === "ACTIVE" ? "active" : "past";
  return {
    id: program.id,
    name: program.name,
    category: program.category,
    icon: program.icon,
    startYear: program.startYear,
    status,
    href: programHref(program.id, status, query),
    votingEndsAt: activeVotingEndsAt(program, now),
  };
}

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
  now = new Date(),
): ProgramSidebarItem[] {
  if (view === "past") {
    const archivedIds = new Set(archivedPrograms.map((program) => program.id));
    const openProgramsById = new Map(openPrograms.map((program) => [program.id, program]));
    return [
      ...archivedPrograms.map((program) => ({
        ...program,
        status: "past" as const,
        href: programHref(program.id, "past", query),
        votingEndsAt: activeVotingEndsAt(openProgramsById.get(program.id), now),
      })),
      ...openPrograms
        .filter((program) => !archivedIds.has(program.id))
        .map((program) => visibleProgramSidebarItem(program, query, now)),
    ];
  }

  const activeIds = new Set(openPrograms.map((program) => program.id));
  return [
    ...openPrograms.map((program) => visibleProgramSidebarItem(program, query, now)),
    ...archivedPrograms
      .filter((program) => !activeIds.has(program.id))
      .map((program) => ({
        ...program,
        status: "past" as const,
        href: programHref(program.id, "past", query),
      })),
  ];
}
