import type { TaskStatus } from "@/modules/team/application/team-workspace-ports";

export type TaskPageItem = {
  id: string;
  title: string;
  dueAt: Date;
  status: TaskStatus;
  assignees: Array<{ id: string; name: string }>;
};

export type TaskDeadlineState = "OVERDUE" | "UPCOMING" | "COMPLETE";
export type SchedulePhaseState = "COMPLETE" | "CURRENT" | "UPCOMING";

const activeStatusPriority: Record<Exclude<TaskStatus, "DONE">, number> = {
  IN_PROGRESS: 0,
  TODO: 1,
};

function compareStable(left: TaskPageItem, right: TaskPageItem): number {
  return left.dueAt.getTime() - right.dueAt.getTime()
    || left.title.localeCompare(right.title, "ko")
    || left.id.localeCompare(right.id);
}

export function taskDeadlineState(
  task: TaskPageItem,
  now: Date,
): TaskDeadlineState {
  if (task.status === "DONE") return "COMPLETE";
  return task.dueAt.getTime() < now.getTime() ? "OVERDUE" : "UPCOMING";
}

export function presentTasks(tasks: TaskPageItem[], now: Date) {
  const active = tasks
    .filter((task) => task.status !== "DONE")
    .sort((left, right) => {
      const overdueDifference = Number(taskDeadlineState(left, now) !== "OVERDUE")
        - Number(taskDeadlineState(right, now) !== "OVERDUE");
      if (overdueDifference !== 0) return overdueDifference;
      const statusDifference = activeStatusPriority[left.status as Exclude<TaskStatus, "DONE">]
        - activeStatusPriority[right.status as Exclude<TaskStatus, "DONE">];
      return statusDifference || compareStable(left, right);
    });
  const completed = tasks
    .filter((task) => task.status === "DONE")
    .sort((left, right) => compareStable(right, left));

  return { active, completed, focus: active[0] ?? null };
}

export function schedulePhaseState(start: Date, end: Date, now: Date): SchedulePhaseState {
  if (now.getTime() < start.getTime()) return "UPCOMING";
  if (now.getTime() > end.getTime()) return "COMPLETE";
  return "CURRENT";
}
