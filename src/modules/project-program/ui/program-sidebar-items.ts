import type { ProgramSidebarItem } from "@/modules/project-program/ui/program-sidebar";
import { programLifecycleStatus, type ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import { isProgramVotingOpen } from "@/modules/project-program/domain/project-program-policy";
import type { ArchivedProgramOption } from "@/modules/team/application/archive-projects";

export type ProgramSidebarQuery = {
  query?: string;
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

export function buildAdminProgramSidebarItems(
  programs: ProjectProgramRecord[],
  now = new Date(),
  pendingApprovalCounts: ReadonlyMap<string, number> = new Map(),
): ProgramSidebarItem[] {
  return programs.map((program) => {
    const status = programLifecycleStatus(program) === "CLOSED"
      ? "past"
      : program.isPublic
        ? "active"
        : "draft";
    const projectHref = status === "past"
      ? `/topics?view=past&programId=${encodeURIComponent(program.id)}`
      : `/topics?programId=${encodeURIComponent(program.id)}`;
    return {
      id: program.id,
      name: program.name,
      category: program.category,
      icon: program.icon,
      startYear: program.startYear,
      status,
      href: projectHref,
      votingEndsAt: activeVotingEndsAt(program, now),
      votingHref: projectHref,
      projectCount: program.topicCount,
      visibility: program.isPublic ? "public" : "private",
      pendingApprovalCount: pendingApprovalCounts.get(program.id) || undefined,
    };
  });
}

/**
 * 사이드바에 보이는 순서. 대분류를 투표 중 → 진행 중 → 초안 → 종료로 세우고,
 * 같으면 최근 연도, 그다음 가나다순으로 둔다.
 *
 * 화면 정렬과 기본 선택이 서로 다른 규칙을 쓰면 "목록 맨 위는 해커톤인데 눌러 보면
 * 다른 프로그램이 열리는" 어긋남이 생긴다. 두 곳이 이 함수를 함께 쓴다.
 */
export function orderProgramSidebarCategories(items: readonly ProgramSidebarItem[]): string[] {
  const groups = new Map<string, ProgramSidebarItem[]>();
  for (const item of items) {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  }
  const rank = (category: string) => {
    const group = groups.get(category)!;
    if (group.some((item) => item.votingEndsAt)) return 0;
    if (group.some((item) => item.status === "active")) return 1;
    if (group.some((item) => item.status === "draft")) return 2;
    return 3;
  };
  const maxYear = (category: string) => Math.max(...groups.get(category)!.map((item) => item.startYear));
  return [...groups.keys()].sort((a, b) =>
    rank(a) - rank(b) || maxYear(b) - maxYear(a) || a.localeCompare(b, "ko"));
}

/** 사이드바에 보이는 순서대로 늘어놓은 프로그램 id 목록. */
export function orderedProgramSidebarIds(items: readonly ProgramSidebarItem[]): string[] {
  const order = orderProgramSidebarCategories(items);
  return order.flatMap((category) => items.filter((item) => item.category === category).map((item) => item.id));
}
