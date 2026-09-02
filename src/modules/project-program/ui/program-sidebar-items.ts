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
 * 사이드바에 보이는 대분류 순서. 운영자가 정해 둔 차례를 그대로 따른다.
 *
 * 예전에는 투표 중 → 진행 중 → 초안 → 종료로 저절로 세웠다. 그 규칙을 걷어냈다.
 * 목록 맨 위가 곧 첫 진입점이고 사이트의 얼굴이라, 행사 일정에 따라 저절로 바뀌는
 * 것보다 운영자가 잡아 두는 편이 낫다. 투표 중인 프로그램은 위쪽 배너로 따로 보인다.
 *
 * 순서에 없는 분류는 뒤에 가나다순으로 붙는다. 새 분류를 만들자마자 화면이 흐트러지지
 * 않게 하려는 것이다.
 *
 * 화면 정렬과 기본 선택이 서로 다른 규칙을 쓰면 "목록 맨 위는 해커톤인데 눌러 보면
 * 다른 프로그램이 열리는" 어긋남이 생긴다. 두 곳이 이 함수를 함께 쓴다.
 */
export function orderProgramSidebarCategories(
  items: readonly ProgramSidebarItem[],
  categoryOrder: readonly string[] = [],
): string[] {
  const rank = new Map(categoryOrder.map((category, index) => [category, index]));
  const unranked = rank.size;
  return [...new Set(items.map((item) => item.category))].sort((left, right) =>
    (rank.get(left) ?? unranked) - (rank.get(right) ?? unranked) || left.localeCompare(right, "ko"));
}

/** 사이드바에 보이는 순서대로 늘어놓은 프로그램 id 목록. */
export function orderedProgramSidebarIds(
  items: readonly ProgramSidebarItem[],
  categoryOrder: readonly string[] = [],
): string[] {
  const order = orderProgramSidebarCategories(items, categoryOrder);
  return order.flatMap((category) => items.filter((item) => item.category === category).map((item) => item.id));
}
