import { describe, expect, it } from "vitest";

import { buildAdminProgramSidebarItems, buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";

describe("buildProgramSidebarItems", () => {
  const archivedProgramPeriod = {
    startsAt: new Date("2025-03-01T00:00:00+09:00"),
    endsAt: new Date("2025-12-20T23:59:59+09:00"),
    projectRegistrationStartsAt: new Date("2025-02-01T00:00:00+09:00"),
    projectRegistrationEndsAt: new Date("2025-03-31T23:59:59+09:00"),
    votingPolicy: null,
  };
  const openProgram = {
    id: "open-2026",
    name: "AI 부스터 2026",
    icon: "FOLDER" as const,
    category: "교육",
    startYear: 2026,
    status: "OPEN" as const,
    openedAt: new Date("2026-01-01T00:00:00+09:00"),
    topicCount: 1,
    teamCount: 0,
    startsAt: new Date("2026-01-01T00:00:00+09:00"),
    endsAt: new Date("2099-12-31T23:59:59+09:00"),
    recruitmentStartsAt: new Date("2026-01-01T00:00:00+09:00"),
    recruitmentEndsAt: new Date("2026-12-01T00:00:00+09:00"),
    executionStartsAt: new Date("2026-01-01T00:00:00+09:00"),
    executionEndsAt: new Date("2026-12-01T00:00:00+09:00"),
    advisorEnabled: true,
    studentProjectCreationEnabled: false,
    isPublic: true,
  };

  it("진행 중 화면에서는 진행 중 프로그램을 우선한다", () => {
    expect(buildProgramSidebarItems([openProgram], [
      { id: "open-2026", name: "중복", category: "교육", startYear: 2026, icon: "FOLDER", ...archivedProgramPeriod },
      { id: "past-2025", name: "캡스톤 2025", category: "캡스톤", startYear: 2025, icon: "GRADUATION_CAP", ...archivedProgramPeriod },
    ])).toEqual([
      expect.objectContaining({ id: "open-2026", status: "active", href: "/topics?programId=open-2026" }),
      expect.objectContaining({ id: "past-2025", status: "past", href: "/topics?view=past&programId=past-2025" }),
    ]);
  });

  it("지난 화면에서는 진행 중 프로그램의 아카이브 링크를 유지한다", () => {
    expect(buildProgramSidebarItems([openProgram], [
      { id: "open-2026", name: "AI 부스터 2026", category: "교육", startYear: 2026, icon: "FOLDER", ...archivedProgramPeriod },
    ], "past")).toEqual([
      expect.objectContaining({
        id: "open-2026",
        status: "past",
        href: "/topics?view=past&programId=open-2026",
      }),
    ]);
  });

  it("진행 중 투표는 활성·지난 화면 모두에서 사이드바 최상단 표시용 마감 시각을 유지한다", () => {
    const now = new Date("2026-08-07T12:00:00+09:00");
    const votingEndsAt = new Date("2026-08-10T18:00:00+09:00");
    const votingProgram = {
      ...openProgram,
      votingPolicy: {
        startsAt: new Date("2026-08-06T09:00:00+09:00"),
        endsAt: votingEndsAt,
        voteLimit: 3,
        staffVoteLimit: 5,
        selfVotingAllowed: false,
        resultsVisibleDuringVoting: false,
        resultsVisibleAfterVoting: true,
      },
    };
    const archiveEntry = { id: "open-2026", name: "AI 부스터 2026", category: "교육", startYear: 2026, icon: "FOLDER" as const, ...archivedProgramPeriod };

    expect(buildProgramSidebarItems([votingProgram], [], "active", {}, now)[0]).toEqual(expect.objectContaining({ votingEndsAt }));
    expect(buildProgramSidebarItems([votingProgram], [archiveEntry], "past", {}, now)[0]).toEqual(expect.objectContaining({
      status: "past",
      href: "/topics?view=past&programId=open-2026",
      votingEndsAt,
    }));

    const archivedVotingProgram = { ...votingProgram, endsAt: new Date("2026-08-07T11:59:59+09:00") };
    expect(buildProgramSidebarItems([archivedVotingProgram], [], "active", {}, now)[0]).toEqual(expect.objectContaining({
      status: "past",
      href: "/topics?view=past&programId=open-2026",
      votingEndsAt,
    }));
  });

  it("프로그램을 바꿀 때 검색어만 보존한다", () => {
    const items = buildProgramSidebarItems([openProgram], [
      { id: "past-2025", name: "캡스톤 2025", category: "캡스톤", startYear: 2025, icon: "GRADUATION_CAP", ...archivedProgramPeriod },
    ], "active", {
      query: "길 찾기",
    });

    expect(items.find(({ id }) => id === "open-2026")?.href).toBe(
      "/topics?programId=open-2026&q=%EA%B8%B8+%EC%B0%BE%EA%B8%B0",
    );
    expect(items.find(({ id }) => id === "past-2025")?.href).toBe(
      "/topics?view=past&programId=past-2025&q=%EA%B8%B8+%EC%B0%BE%EA%B8%B0",
    );
    expect(items.every(({ href }) => !href.includes("page="))).toBe(true);
  });

  it("관리자 사이드바는 팀 수가 아니라 전체 프로젝트 수와 비공개 상태를 사용한다", () => {
    const items = buildAdminProgramSidebarItems([{
      ...openProgram,
      isPublic: false,
      topicCount: 4,
      teamCount: 1,
    }], new Date(), new Map([["open-2026", 3]]));

    expect(items[0]).toEqual(expect.objectContaining({
      status: "draft",
      visibility: "private",
      projectCount: 4,
      pendingApprovalCount: 3,
      href: "/topics?programId=open-2026",
    }));
  });
});
