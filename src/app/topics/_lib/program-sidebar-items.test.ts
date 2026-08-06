import { describe, expect, it } from "vitest";

import { buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";

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
    openedAt: new Date(),
    topicCount: 1,
    teamCount: 0,
    description: "",
    startsAt: new Date(),
    endsAt: new Date(),
    advisorEnabled: true,
    studentProjectCreationEnabled: false,
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

  it("프로그램을 바꿀 때 대상 화면과 호환되는 검색·상태·정렬만 보존한다", () => {
    const items = buildProgramSidebarItems([openProgram], [
      { id: "past-2025", name: "캡스톤 2025", category: "캡스톤", startYear: 2025, icon: "GRADUATION_CAP", ...archivedProgramPeriod },
    ], "active", {
      query: "길 찾기",
      phase: "CLOSING_SOON",
      sort: "DEADLINE",
    });

    expect(items.find(({ id }) => id === "open-2026")?.href).toBe(
      "/topics?programId=open-2026&q=%EA%B8%B8+%EC%B0%BE%EA%B8%B0&phase=CLOSING_SOON&sort=DEADLINE",
    );
    expect(items.find(({ id }) => id === "past-2025")?.href).toBe(
      "/topics?view=past&programId=past-2025&q=%EA%B8%B8+%EC%B0%BE%EA%B8%B0",
    );
    expect(items.every(({ href }) => !href.includes("page="))).toBe(true);
  });
});
