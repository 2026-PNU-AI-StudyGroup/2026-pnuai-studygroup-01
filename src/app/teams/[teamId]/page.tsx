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

const phaseView: Record<SchedulePhaseState, {
  label: string;
  tone: "neutral" | "info" | "success";
  cardClassName: string;
  markerClassName: string;
}> = {
  COMPLETE: {
    label: "완료",
    tone: "success",
    cardClassName: "border-[color-mix(in_srgb,var(--success)_24%,var(--line))] bg-[linear-gradient(145deg,var(--success-subtle),#fff_72%)]",
    markerClassName: "bg-[var(--success)] text-white",
  },
  CURRENT: {
    label: "진행 중",
    tone: "info",
    cardClassName: "border-[color-mix(in_srgb,var(--primary)_32%,var(--line))] bg-[linear-gradient(145deg,var(--primary-subtle),#fff_72%)] shadow-[0_12px_30px_rgba(31,35,48,0.06)]",
    markerClassName: "bg-[var(--primary)] text-white",
  },
  UPCOMING: {
    label: "다음",
    tone: "neutral",
    cardClassName: "border-[var(--line)] bg-white",
    markerClassName: "bg-[var(--surface-subtle)] text-[var(--muted)]",
  },
};

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

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title={workspace.topicTitle}
        bordered={false}
        actions={workspace.access.canSupervise ? <Link href={`/professor/topics/${workspace.topicId}/assistants`} className="button-secondary"><UiText>{"조교 관리"}</UiText></Link> : undefined}
      />

      <section
        aria-labelledby="next-action-title"
        className={`relative overflow-hidden rounded-[var(--radius-panel)] border p-5 shadow-[0_14px_38px_rgba(31,35,48,0.07)] sm:p-7 ${
          focusDeadlineState === "OVERDUE"
            ? "border-[color-mix(in_srgb,var(--danger)_38%,var(--line))] bg-[linear-gradient(135deg,var(--danger-subtle),#fff_76%)]"
            : nextTask
              ? "border-[color-mix(in_srgb,var(--primary)_30%,var(--line))] bg-[linear-gradient(135deg,var(--primary-subtle),#fff_76%)]"
              : "border-[color-mix(in_srgb,var(--success)_28%,var(--line))] bg-[linear-gradient(135deg,var(--success-subtle),#fff_76%)]"
        }`}
      >
        <div aria-hidden="true" className="absolute -right-16 -top-20 size-52 rounded-full bg-white/55" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.12em] text-[var(--primary-hover)]"><UiText>{"다가오는 할 일"}</UiText></p>
            {nextTask ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={taskStatusView[nextTask.status].tone}><UiText>{taskStatusView[nextTask.status].label}</UiText></StatusBadge>
                  {focusDeadlineState === "OVERDUE" ? <StatusBadge tone="danger"><UiText>{"기한 초과"}</UiText></StatusBadge> : null}
                </div>
                <h2 id="next-action-title" className="mt-3 text-xl font-black leading-tight tracking-[-0.035em] text-[var(--ink)] sm:text-2xl">
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
                <h2 id="next-action-title" className="mt-3 text-xl font-black leading-tight tracking-[-0.035em] text-[var(--ink)] sm:text-2xl">
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

      <section aria-labelledby="schedule-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="schedule-title" className="text-2xl font-black tracking-[-0.04em]"><UiText>{"프로젝트 기간"}</UiText></h2>
          </div>
        </div>
        <ol className="mt-4 grid gap-4 xl:grid-cols-3">
          {schedule.map(([label, start, end], index) => {
            const state = schedulePhaseState(start, end, now);
            const view = phaseView[state];
            return (
              <li key={label} className={`rounded-[var(--radius-panel)] border p-5 ${view.cardClassName}`}>
                <div className="flex items-center justify-between gap-4">
                  <span aria-hidden="true" className={`grid size-9 place-items-center rounded-xl text-sm font-black ${view.markerClassName}`}>{index + 1}</span>
                  <StatusBadge tone={view.tone}><UiText>{view.label}</UiText></StatusBadge>
                </div>
                <h3 className="mt-5 text-lg font-black"><UiText>{label}</UiText>{" "}<UiText>{"기간"}</UiText></h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]">
                  <UiDate value={start} mode="date" /> – <UiDate value={end} mode="date" />
                </p>
              </li>
            );
          })}
        </ol>
      </section>

    </div>
  );
}
