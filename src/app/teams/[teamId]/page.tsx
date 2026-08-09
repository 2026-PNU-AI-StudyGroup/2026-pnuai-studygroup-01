import Link from "next/link";
import type { Metadata } from "next";

import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import {
  taskDeadlineState,
  presentTasks,
  schedulePhaseState,
  type SchedulePhaseState,
} from "@/app/teams/[teamId]/_lib/task-page-presentation";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 개요");
}

const taskStatusView = {
  TODO: { label: "할 일", tone: "info" },
  IN_PROGRESS: { label: "진행 중", tone: "warning" },
  DONE: { label: "완료", tone: "success" },
} as const;

const timelineBarClass: Record<SchedulePhaseState, string> = {
  COMPLETE: "border border-[var(--line-strong)] bg-[var(--surface-subtle)] text-[var(--muted)]",
  CURRENT: "bg-[var(--primary)] text-white",
  UPCOMING: "border border-dashed border-[color-mix(in_srgb,var(--primary)_42%,var(--line))] bg-[var(--primary-subtle)] text-[var(--primary-hover)]",
};

function buildScheduleTimeline(
  phases: { label: string; start: Date; end: Date; state: SchedulePhaseState }[],
  now: Date,
) {
  const axisStart = Math.min(...phases.map((phase) => phase.start.getTime()));
  const axisEnd = Math.max(...phases.map((phase) => phase.end.getTime()));
  const span = Math.max(1, axisEnd - axisStart);
  const toPct = (time: number) => ((time - axisStart) / span) * 100;
  const ticks: { key: string; month: number; left: number }[] = [];
  const cursor = new Date(new Date(axisStart).getFullYear(), new Date(axisStart).getMonth(), 1);
  while (cursor.getTime() <= axisEnd) {
    ticks.push({ key: `${cursor.getFullYear()}-${cursor.getMonth()}`, month: cursor.getMonth() + 1, left: Math.max(0, toPct(cursor.getTime())) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const rows = phases.map((phase) => ({
    label: phase.label,
    left: toPct(phase.start.getTime()),
    width: Math.max(3, toPct(phase.end.getTime()) - toPct(phase.start.getTime())),
    state: phase.state,
    endText: `${phase.end.getMonth() + 1}.${phase.end.getDate()}`,
  }));
  return { ticks, rows, todayLeft: toPct(now.getTime()), showToday: now.getTime() >= axisStart && now.getTime() <= axisEnd };
}

export default async function TeamOverviewPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { workspace } = await loadTeamWorkspace(teamId);
  const now = new Date();
  const { focus: nextTask } = presentTasks(workspace.tasks, now);
  const focusDeadlineState = nextTask ? taskDeadlineState(nextTask, now) : null;
  const schedule = [
    ["모집", workspace.schedule.recruitmentStartsAt, workspace.schedule.programRecruitmentEndsAt],
    ["수행", workspace.schedule.executionStartsAt, workspace.schedule.executionEndsAt],
    ["제출", workspace.schedule.submissionStartsAt, workspace.schedule.submissionEndsAt],
  ] as const;
  const timeline = buildScheduleTimeline(
    schedule.map(([label, start, end]) => ({ label, start, end, state: schedulePhaseState(start, end, now) })),
    now,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title={workspace.topicTitle}
        bordered={false}
        actions={workspace.access.canSupervise ? <Link href={`/professor/topics/${workspace.topicId}/assistants`} className="button-secondary"><UiText>{"조교 관리"}</UiText></Link> : undefined}
      />

      <section
        aria-labelledby="next-action-title"
        className={`relative overflow-hidden rounded-[var(--radius-panel)] border p-5 sm:p-7 ${
          focusDeadlineState === "OVERDUE"
            ? "border-[color-mix(in_srgb,var(--danger)_38%,var(--line))] bg-[var(--danger-subtle)]"
            : nextTask
              ? "border-[color-mix(in_srgb,var(--primary)_30%,var(--line))] bg-[var(--primary-subtle)]"
              : "border-[color-mix(in_srgb,var(--success)_28%,var(--line))] bg-[var(--success-subtle)]"
        }`}
      >
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.12em] text-[var(--primary-hover)]"><UiText>{"다가오는 할 일"}</UiText></p>
            {nextTask ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={taskStatusView[nextTask.status].tone}><UiText>{taskStatusView[nextTask.status].label}</UiText></StatusBadge>
                  {focusDeadlineState === "OVERDUE" ? <StatusBadge tone="danger"><UiText>{"기한 초과"}</UiText></StatusBadge> : null}
                </div>
                <h2 id="next-action-title" className="mt-3 text-xl font-bold leading-tight tracking-[-0.035em] text-[var(--ink)] sm:text-2xl">
                  <UiText>{nextTask.title}</UiText>
                </h2>
                <dl className="mt-5 grid max-w-2xl gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"완료 예정"}</UiText></dt>
                    <dd className={`mt-1 font-bold ${focusDeadlineState === "OVERDUE" ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
                      <time dateTime={nextTask.dueAt.toISOString()}><UiDate value={nextTask.dueAt} mode="date" /></time>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText></dt>
                    <dd className="mt-1 break-words font-bold text-[var(--ink)]">
                      <UiText>{nextTask.assignees.map(({ name }) => name).join(", ") || "미지정"}</UiText>
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                <StatusBadge tone={workspace.taskCount > 0 ? "success" : "neutral"}>
                  <UiText>{workspace.status === "CLOSED" ? "프로젝트 종료" : "완료"}</UiText>
                </StatusBadge>
                <h2 id="next-action-title" className="mt-3 text-xl font-bold leading-tight tracking-[-0.035em] text-[var(--ink)] sm:text-2xl">
                  <UiText>{workspace.taskCount > 0 ? "모든 할 일 완료" : "등록된 할 일이 없습니다"}</UiText>
                </h2>
                {workspace.taskCount === 0 ? <p className="mt-2 text-sm font-medium leading-6 text-[var(--ink)]"><UiText>{"첫 할 일과 완료 예정일, 담당자를 정해 주세요."}</UiText></p> : null}
              </>
            )}
          </div>
          <Link href={`/teams/${teamId}/tasks`} className="button-primary relative shrink-0 self-start xl:self-auto">
            <UiText>{"할 일"}</UiText>{" "}<UiText>{"확인"}</UiText>
          </Link>
        </div>
      </section>

      <section aria-labelledby="schedule-title" className="panel overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <h2 id="schedule-title" className="text-base font-bold tracking-[-0.02em]"><UiText>{"프로젝트 일정"}</UiText></h2>
        </div>
        <div className="px-4 py-6 sm:px-6">
          <div className="relative ml-16 h-6 border-b border-[var(--line)]">
            {timeline.ticks.map((tick) => (
              <span key={tick.key} className="absolute top-1 -translate-x-px text-[0.7rem] font-medium text-[var(--muted)]" style={{ left: `${tick.left}%` }}>
                {tick.month}<UiText>{"월"}</UiText>
              </span>
            ))}
          </div>
          <div className="relative mt-3 grid gap-3">
            {timeline.rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[4rem_minmax(0,1fr)] items-center">
                <span className="text-[0.8125rem] font-semibold text-[var(--ink)]"><UiText>{row.label}</UiText></span>
                <div className="relative h-9">
                  {timeline.ticks.map((tick) => (
                    <span key={tick.key} aria-hidden="true" className="absolute -top-1 bottom-1 w-px bg-[var(--line)]" style={{ left: `${tick.left}%` }} />
                  ))}
                  <div
                    className={`absolute top-1.5 flex h-6 items-center justify-end rounded-md px-2.5 text-[0.72rem] font-semibold tabular-nums ${timelineBarClass[row.state]}`}
                    style={{ left: `${row.left}%`, width: `${row.width}%` }}
                  >
                    {row.endText}
                  </div>
                </div>
              </div>
            ))}
            {timeline.showToday ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-16 right-0">
                <span className="absolute -top-1 bottom-1 w-0.5 bg-[var(--ink)]" style={{ left: `${timeline.todayLeft}%` }}>
                  <span className="absolute -top-0.5 left-1 whitespace-nowrap text-[0.65rem] font-bold text-[var(--ink)]"><UiText>{"오늘"}</UiText></span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

    </div>
  );
}
