import Link from "next/link";
import type { Metadata } from "next";

import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { TeamProjectInfoEditDialog } from "@/app/projects/[projectId]/_components/team-project-info-form";
import { ProgramAnnouncementRail } from "@/modules/announcement/ui/program-announcement-rail";
import {
  taskDeadlineState,
  presentTasks,
  schedulePhaseState,
  type SchedulePhaseState,
} from "@/app/projects/[projectId]/_lib/task-page-presentation";
import { loadTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ProfileIcon } from "@/shared/ui/workspace-icons";

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

export default async function TeamOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(projectId);
  const announcementService = new AnnouncementService(new PrismaAnnouncementRepository(prisma));
  const announcements = await announcementService.listForTeamOverview(await resolveAnnouncementAudience(actor), workspace.id);
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
  const canEditProjectInfo = workspace.access.canSupervise || workspace.access.isTeamLeader;
  const projectInfoEditAction = workspace.status === "IN_PROGRESS" && (canEditProjectInfo || workspace.access.isTeamMember)
    ? <TeamProjectInfoEditDialog
        teamId={workspace.id}
        programName={workspace.programName}
        title={workspace.name}
        description={workspace.topicDescription}
        disabled={!canEditProjectInfo}
      />
    : null;
  const headerActions = projectInfoEditAction || workspace.access.canSupervise
    ? <>{projectInfoEditAction}{workspace.access.canSupervise ? <Link href={`/professor/topics/${workspace.topicId}/assistants`} className="button-secondary gap-2"><ProfileIcon className="size-4 shrink-0" /><UiText>{"조교 관리"}</UiText></Link> : null}</>
    : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        eyebrow={workspace.programName}
        title={workspace.name}
        description={workspace.topicTitle !== workspace.name ? workspace.topicTitle : undefined}
        bordered={false}
        actions={headerActions}
      />

      <section
        aria-labelledby="next-action-title"
        className="panel overflow-hidden"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="next-action-title" className="text-base font-bold tracking-[-0.02em]"><UiText>{"다가오는 할 일"}</UiText></h2>
            {nextTask ? (
              <>
                <StatusBadge tone={taskStatusView[nextTask.status].tone}><UiText>{taskStatusView[nextTask.status].label}</UiText></StatusBadge>
                {focusDeadlineState === "OVERDUE" ? <StatusBadge tone="danger"><UiText>{"기한 초과"}</UiText></StatusBadge> : null}
              </>
            ) : (
              <StatusBadge tone={workspace.taskCount > 0 ? "success" : "neutral"}>
                <UiText>{workspace.status === "COMPLETED" ? "프로젝트 종료" : "완료"}</UiText>
              </StatusBadge>
            )}
          </div>
          <Link href={`/projects/${projectId}/tasks`} className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">
            <UiText>{"할 일"}</UiText>{" "}<UiText>{"전체 보기"}</UiText>
          </Link>
        </header>
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {nextTask ? (
            <>
              <h3 className="text-xl font-bold leading-tight tracking-[-0.03em] text-[var(--ink)]">
                <UiText>{nextTask.title}</UiText>
              </h3>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div className="flex items-baseline gap-2">
                  <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"완료 예정"}</UiText></dt>
                  <dd className={`font-bold ${focusDeadlineState === "OVERDUE" ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>
                    <time dateTime={nextTask.dueAt.toISOString()}><UiDate value={nextTask.dueAt} mode="date" /></time>
                  </dd>
                </div>
                <div className="flex min-w-0 items-baseline gap-2">
                  <dt className="shrink-0 text-xs font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText></dt>
                  <dd className="break-words font-bold text-[var(--ink)]">
                    <UiText>{nextTask.assignees.map(({ name }) => name).join(", ") || "미지정"}</UiText>
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">
                <UiText>{workspace.taskCount > 0 ? "모든 할 일 완료" : "등록된 할 일이 없습니다"}</UiText>
              </h3>
              {workspace.taskCount === 0 ? <p className="muted mt-2 text-sm leading-6"><UiText>{"첫 할 일과 완료 예정일, 담당자를 정해 주세요."}</UiText></p> : null}
            </>
          )}
        </div>
      </section>

      <ProgramAnnouncementRail
        announcements={announcements}
        manageableAnnouncementIds={announcements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id)}
        returnHref={`/projects/${projectId}`}
      />

      <section aria-labelledby="schedule-title" className="panel overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <h2 id="schedule-title" className="text-base font-bold tracking-[-0.02em]"><UiText>{"프로그램 일정"}</UiText></h2>
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
