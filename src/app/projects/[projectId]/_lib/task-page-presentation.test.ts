import { describe, expect, it } from "vitest";

import {
  taskDeadlineState,
  presentTasks,
  schedulePhaseState,
  type TaskPageItem,
} from "@/app/projects/[projectId]/_lib/task-page-presentation";

function task(
  id: string,
  status: TaskPageItem["status"],
  dueAt: string,
): TaskPageItem {
  return {
    id,
    title: id,
    status,
    dueAt: new Date(dueAt),
    completedAt: status === "DONE" ? new Date(dueAt) : null,
    assignees: [],
  };
}

describe("task page presentation", () => {
  const now = new Date("2026-08-04T00:00:00.000Z");

  it("기한이 지난 활성 항목을 먼저 두고 같은 긴급도에서는 진행 중을 우선한다", () => {
    const source = [
      task("future-progress", "IN_PROGRESS", "2026-08-20T00:00:00.000Z"),
      task("overdue-todo", "TODO", "2026-08-01T00:00:00.000Z"),
      task("future-todo", "TODO", "2026-08-10T00:00:00.000Z"),
      task("near-progress", "IN_PROGRESS", "2026-08-15T00:00:00.000Z"),
    ];

    const result = presentTasks(source, now);

    expect(result.active.map(({ id }) => id)).toEqual([
      "overdue-todo",
      "near-progress",
      "future-progress",
      "future-todo",
    ]);
    expect(result.focus?.id).toBe("overdue-todo");
    expect(source.map(({ id }) => id)).toEqual([
      "future-progress",
      "overdue-todo",
      "future-todo",
      "near-progress",
    ]);
  });

  it("완료 항목은 활성 목록과 분리하고 최근 완료일 순서로 둔다", () => {
    const oldDone = task("old-done", "DONE", "2026-07-20T00:00:00.000Z");
    oldDone.completedAt = new Date("2026-07-01T00:00:00.000Z");
    const recentDone = task("recent-done", "DONE", "2026-07-01T00:00:00.000Z");
    recentDone.completedAt = new Date("2026-07-20T00:00:00.000Z");
    const result = presentTasks([
      oldDone,
      task("active", "TODO", "2026-09-01T00:00:00.000Z"),
      recentDone,
    ], now);

    expect(result.active.map(({ id }) => id)).toEqual(["active"]);
    expect(result.completed.map(({ id }) => id)).toEqual(["recent-done", "old-done"]);
  });

  it("완료 여부를 우선해 마감 상태를 계산한다", () => {
    expect(taskDeadlineState(task("late", "TODO", "2026-08-03T23:59:59.999Z"), now)).toBe("OVERDUE");
    expect(taskDeadlineState(task("today", "TODO", "2026-08-04T00:00:00.000Z"), now)).toBe("UPCOMING");
    expect(taskDeadlineState(task("done", "DONE", "2026-07-01T00:00:00.000Z"), now)).toBe("COMPLETE");
  });

  it("기간의 시작과 종료 경계를 현재 단계에 포함한다", () => {
    const start = new Date("2026-08-04T00:00:00.000Z");
    const end = new Date("2026-08-10T00:00:00.000Z");

    expect(schedulePhaseState(start, end, new Date("2026-08-03T23:59:59.999Z"))).toBe("UPCOMING");
    expect(schedulePhaseState(start, end, start)).toBe("CURRENT");
    expect(schedulePhaseState(start, end, end)).toBe("CURRENT");
    expect(schedulePhaseState(start, end, new Date("2026-08-10T00:00:00.001Z"))).toBe("COMPLETE");
  });
});
