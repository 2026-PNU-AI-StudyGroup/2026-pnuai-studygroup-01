import { describe, expect, it } from "vitest";

import {
  buildProjectDashboardCounts,
  collectDashboardDeadlines,
  parseProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";

describe("내 프로젝트 상태 보기", () => {
  it("지원과 실제 프로젝트를 중복 없이 상태별로 집계한다", () => {
    expect(buildProjectDashboardCounts({
      pending: 2,
      rejected: 1,
      active: 3,
      completed: 4,
    })).toEqual({
      all: 10,
      pending: 2,
      rejected: 1,
      active: 3,
      completed: 4,
    });
  });

  it("지원하지 않는 보기 값은 전체로 정규화한다", () => {
    expect(parseProjectDashboardView("pending")).toBe("pending");
    expect(parseProjectDashboardView("unknown")).toBe("all");
    expect(parseProjectDashboardView(["active", "rejected"])).toBe("all");
  });
});

describe("다가오는 마감", () => {
  it("진행 중 프로젝트의 미제출 보고서와 남은 할 일만 날짜순으로 모은다", () => {
    const team = (id: string, status: string) => ({
      id,
      topicTitle: `${id} 프로젝트`,
      programName: "캡스톤",
      status,
      tasks: [
        { id: `${id}-done`, title: "끝난 일", dueAt: new Date("2026-11-01"), status: "DONE", assignees: [] },
        { id: `${id}-todo`, title: "남은 일", dueAt: new Date("2026-11-09"), status: "TODO", assignees: [{ name: "정하늘" }] },
      ],
    });
    const deadlines = collectDashboardDeadlines(
      [team("a", "IN_PROGRESS"), team("b", "COMPLETED")],
      [
        { id: "r1", projectId: "a", title: "중간 보고서", dueAt: new Date("2026-11-04") },
        { id: "r2", projectId: "b", title: "끝난 사업 보고서", dueAt: new Date("2026-11-02") },
      ],
    );

    expect(deadlines.map(({ key }) => key)).toEqual(["report-r1", "task-a-todo"]);
    expect(deadlines[1]).toMatchObject({ kind: "TASK", projectTitle: "a 프로젝트", assignees: ["정하늘"] });
  });
});
