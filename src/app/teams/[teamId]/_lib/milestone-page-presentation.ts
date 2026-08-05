import type { MilestoneStatus } from "@/modules/team/application/team-workspace-ports";

export type MilestonePageItem = {
  id: string;
  title: string;
  dueAt: Date;
  status: MilestoneStatus;
  assignees: Array<{ id: string; name: string }>;
};

export type MilestoneDeadlineState = "OVERDUE" | "UPCOMING" | "COMPLETE";
export type SchedulePhaseState = "COMPLETE" | "CURRENT" | "UPCOMING";

const activeStatusPriority: Record<Exclude<MilestoneStatus, "DONE">, number> = {
  IN_PROGRESS: 0,
  TODO: 1,
};

function compareStable(left: MilestonePageItem, right: MilestonePageItem): number {
  return left.dueAt.getTime() - right.dueAt.getTime()
    || left.title.localeCompare(right.title, "ko")
    || left.id.localeCompare(right.id);
}

export function milestoneDeadlineState(
  milestone: MilestonePageItem,
  now: Date,
): MilestoneDeadlineState {
  if (milestone.status === "DONE") return "COMPLETE";
  return milestone.dueAt.getTime() < now.getTime() ? "OVERDUE" : "UPCOMING";
}

export function presentMilestones(milestones: MilestonePageItem[], now: Date) {
  const active = milestones
    .filter((milestone) => milestone.status !== "DONE")
    .sort((left, right) => {
      const overdueDifference = Number(milestoneDeadlineState(left, now) !== "OVERDUE")
        - Number(milestoneDeadlineState(right, now) !== "OVERDUE");
      if (overdueDifference !== 0) return overdueDifference;
      const statusDifference = activeStatusPriority[left.status as Exclude<MilestoneStatus, "DONE">]
        - activeStatusPriority[right.status as Exclude<MilestoneStatus, "DONE">];
      return statusDifference || compareStable(left, right);
    });
  const completed = milestones
    .filter((milestone) => milestone.status === "DONE")
    .sort((left, right) => compareStable(right, left));

  return { active, completed, focus: active[0] ?? null };
}

export function schedulePhaseState(start: Date, end: Date, now: Date): SchedulePhaseState {
  if (now.getTime() < start.getTime()) return "UPCOMING";
  if (now.getTime() > end.getTime()) return "COMPLETE";
  return "CURRENT";
}
