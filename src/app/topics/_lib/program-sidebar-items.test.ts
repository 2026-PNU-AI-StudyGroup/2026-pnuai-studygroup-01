import { describe, expect, it } from "vitest";

import { buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";

describe("buildProgramSidebarItems", () => {
  it("진행 중 프로그램을 우선하고 종료된 프로그램만 지난 상태로 추가한다", () => {
    const openProgram = {
      id: "open-2026",
      name: "AI 부스터 2026",
      category: "교육",
      academicYear: 2026,
      academicCycleId: "cycle-2026",
      term: "FIRST" as const,
      status: "OPEN" as const,
      openedAt: new Date(),
      topicCount: 1,
      teamCount: 0,
      description: "",
      startsAt: new Date(),
      endsAt: new Date(),
    };

    expect(buildProgramSidebarItems([openProgram], [
      { id: "open-2026", name: "중복", category: "교육", academicYear: 2026 },
      { id: "past-2025", name: "캡스톤 2025", category: "캡스톤", academicYear: 2025 },
    ])).toEqual([
      expect.objectContaining({ id: "open-2026", status: "active", href: "/topics?programId=open-2026" }),
      expect.objectContaining({ id: "past-2025", status: "past", href: "/topics?view=past&programId=past-2025" }),
    ]);
  });
});
