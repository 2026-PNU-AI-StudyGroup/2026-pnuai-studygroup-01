import Link from "next/link";
import type { Metadata } from "next";

import { announcementDeleteControls } from "@/app/_components/announcement-delete-controls";
import { ProgramAnnouncementRail } from "@/modules/announcement/ui/program-announcement-rail";
import {
  taskDeadlineState,
  presentTasks,
  schedulePhaseState,
  type SchedulePhaseState,
} from "@/modules/team/ui/task-presentation";
import { loadTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { ConfirmTeamForm } from "@/app/projects/[projectId]/_components/confirm-team-form";
import { TeamProjectInfoEditDialog } from "@/app/projects/[projectId]/_components/team-project-info-form";
import { TeamRosterSummary } from "@/app/projects/[projectId]/_components/team-roster-summary";
import { ProjectAwardBadge } from "@/modules/project-program/ui/project-award-badge";
import { cardClass, CardHead, daysLabel, daysUntil, HeadLink, KpiStrip, ObjectHeader, Pill, pillToneFor, Thumb } from "@/modules/project-program/ui/work-screen";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiDiv } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ProgramIcon } from "@/shared/ui/program-icon";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 개요");
}

const taskStatusView = {
  TODO: { label: "할 일", tone: "plain" },
  IN_PROGRESS: { label: "진행 중", tone: "accent" },
  DONE: { label: "완료", tone: "plain" },
} as const;

const laneClass: Record<SchedulePhaseState, string> = {
  COMPLETE: "bg-[var(--surface-active)]",
  CURRENT: "bg-[var(--accent-track)]",
  UPCOMING: "bg-[var(--accent-subtle)]",
};

const monthDay = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });

/** 일정 축. 가장 이른 시작부터 가장 늦은 끝까지를 100 으로 놓고 달 눈금과 오늘 자리를 잰다. */
function buildScheduleTimeline(
  phases: { label: string; start: Date; end: Date; state: SchedulePhaseState }[],
  marks: Date[],
  now: Date,
) {
  const axisStart = Math.min(...phases.map((phase) => phase.start.getTime()));
  const axisEnd = Math.max(...phases.map((phase) => phase.end.getTime()));
  const span = Math.max(1, axisEnd - axisStart);
  const toPct = (time: number) => ((time - axisStart) / span) * 100;
  const ticks: { key: string; month: number; left: number }[] = [];
  const cursor = new Date(new Date(axisStart).getFullYear(), new Date(axisStart).getMonth() + 1, 1);
  while (cursor.getTime() <= axisEnd) {
    ticks.push({ key: `${cursor.getFullYear()}-${cursor.getMonth()}`, month: cursor.getMonth() + 1, left: toPct(cursor.getTime()) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const todayLeft = toPct(now.getTime());
  const showToday = now.getTime() >= axisStart && now.getTime() <= axisEnd;
  return {
    // 오늘 표시와 겹치는 달 이름은 빼서 글자가 포개지지 않게 한다.
    ticks: ticks.filter((tick) => !showToday || Math.abs(tick.left - todayLeft) > 4),
    rows: phases.map((phase) => ({
      label: phase.label,
      left: toPct(phase.start.getTime()),
      width: Math.max(1, toPct(phase.end.getTime()) - toPct(phase.start.getTime())),
      state: phase.state,
    })),
    marks: marks
      .filter((date) => date.getTime() >= axisStart && date.getTime() <= axisEnd)
      .map((date) => ({ key: date.toISOString(), left: toPct(date.getTime()), past: date.getTime() < now.getTime() })),
    todayLeft,
    showToday,
  };
}

export default async function TeamOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(projectId);
  const announcementService = new AnnouncementService(new PrismaAnnouncementRepository(prisma));
  // 개요의 공지 칸은 프로그램 공지 자리다. 프로젝트 공지는 프로젝트 공지 화면에서 따로 본다.
  // 표지와 수상, 보고서 마감은 작업 공간 조회에 없어 여기서 따로 읽는다. 보고서는 제출률과 같은 조건(필수, 제출 받는 것)이다.
  const [announcements, topic, reports] = await Promise.all([
    resolveAnnouncementAudience(actor).then((audience) => announcementService.listForProgram(audience, workspace.programId)),
    prisma.topic.findUnique({
      where: { id: workspace.topicId },
      select: { thumbnailPath: true, program: { select: { icon: true } }, projectTeam: { select: { award: true } } },
    }),
    prisma.report.findMany({
      where: { projectTeamId: workspace.id, required: true, submissionEnabled: true },
      orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      select: { id: true, titleSnapshot: true, dueAt: true, versions: { take: 1, select: { id: true } } },
    }),
  ]);
  const now = new Date();
  const { focus: nextTask } = presentTasks(workspace.tasks, now);
  const focusDeadlineState = nextTask ? taskDeadlineState(nextTask, now) : null;

  const reportRows = reports.map((report) => ({
    ...report,
    submitted: report.versions.length > 0,
    overdue: report.versions.length === 0 && report.dueAt < now,
  }));
  const submittedReports = reportRows.filter(({ submitted }) => submitted).length;
  const overdueReports = reportRows.filter(({ overdue }) => overdue).length;
  const nextReport = reportRows.find(({ submitted, dueAt }) => !submitted && dueAt >= now);
  const status = teamStatusPresentation[workspace.status];
  const award = topic?.projectTeam?.award;
  const canEditProjectInfo = workspace.access.canSupervise || workspace.access.isTeamLeader;
  const executionDaysLeft = daysUntil(workspace.schedule.executionEndsAt, now);

  // 머리 한 줄: 넘긴 마감이 먼저, 그다음 가장 가까운 보고서 마감. 수행 기간은 숫자 판에 있어 되풀이하지 않는다.
  const overdueTasks = workspace.tasks.filter((task) => taskDeadlineState(task, now) === "OVERDUE").length;
  const alert = overdueReports > 0
    ? `필수 보고서 ${overdueReports}건이 기한을 넘겼습니다.`
    : overdueTasks > 0
      ? `완료 예정일을 넘긴 할 일이 ${overdueTasks}개입니다.`
      : undefined;
  const votingOpen = workspace.schedule.votingStartsAt && workspace.schedule.votingEndsAt
    && workspace.schedule.votingStartsAt <= now && now < workspace.schedule.votingEndsAt;
  const detail = nextReport
    ? `다음 마감은 ${nextReport.titleSnapshot}, ${monthDay.format(nextReport.dueAt)}(${daysLabel(daysUntil(nextReport.dueAt, now))})입니다.`
    : votingOpen && workspace.schedule.votingEndsAt
      ? `투표는 ${monthDay.format(workspace.schedule.votingEndsAt)}까지 열려 있습니다.`
      : reportRows.length > 0 && submittedReports === reportRows.length
        ? `필수 보고서 ${reportRows.length}건을 모두 냈습니다.`
        : undefined;

  const schedule = [
    ...(workspace.schedule.recruitmentStartsAt && workspace.schedule.programRecruitmentEndsAt ? [["모집", workspace.schedule.recruitmentStartsAt, workspace.schedule.programRecruitmentEndsAt] as const] : []),
    ["수행", workspace.schedule.executionStartsAt, workspace.schedule.executionEndsAt],
    // 투표 일정도 팀이 챙겨야 하는 기간이다. 잡혀 있을 때만 줄을 늘린다.
    ...(workspace.schedule.votingStartsAt && workspace.schedule.votingEndsAt
      ? [["투표", workspace.schedule.votingStartsAt, workspace.schedule.votingEndsAt] as const]
      : []),
  ] as const;
  const timeline = buildScheduleTimeline(
    schedule.map(([label, start, end]) => ({ label, start, end, state: schedulePhaseState(start, end, now) })),
    reportRows.map(({ dueAt }) => dueAt),
    now,
  );
  const visibleReports = reportRows.slice(0, 6);

  return (
    <div className="@container grid gap-3.5">
      <ObjectHeader
        id="project-overview-title"
        media={<Thumb src={topic?.thumbnailPath} fallback={topic ? <ProgramIcon icon={topic.program.icon} /> : null} className="h-[3.875rem] w-[3.125rem]" />}
        title={<UiText>{workspace.topicTitle}</UiText>}
        titleAside={(
          <>
            <Pill tone={pillToneFor(status.tone)}>{status.label}</Pill>
            {award ? <ProjectAwardBadge award={award} /> : null}
            {workspace.status === "IN_PROGRESS" && (canEditProjectInfo || workspace.access.isTeamMember) ? (
              <TeamProjectInfoEditDialog
                teamId={workspace.id}
                programName={workspace.programName}
                title={workspace.topicTitle}
                description={workspace.topicDescription}
                disabled={!canEditProjectInfo}
              />
            ) : null}
          </>
        )}
        meta={<><UiText>{workspace.programName}</UiText>{workspace.name !== workspace.topicTitle ? <>, <UiText>{`${workspace.name} 팀`}</UiText></> : null}{workspace.advisorEnabled ? <>, <UiText>{`지도 ${workspace.professorName}`}</UiText></> : null}</>}
        finding={alert || detail ? (
          <>
            {alert ? <b className="font-semibold"><UiText>{alert}</UiText></b> : null}
            {alert && detail ? " " : null}
            {detail ? <UiText>{detail}</UiText> : null}
          </>
        ) : undefined}
        actions={(
          <>
            {/* 작업 공간을 여는 사람은 프로젝트 상세로 가도 이리로 돌아온다. 방문자 눈에 어떻게 보이는지는 여기서 연다. */}
            <Link href={`/topics/${workspace.topicId}?view=public`} className="button-secondary button-compact"><UiText>{"방문자 화면 보기"}</UiText></Link>
            {workspace.status === "FORMING" && workspace.access.canSupervise ? <ConfirmTeamForm teamId={workspace.id} buttonClassName="button-primary button-compact" /> : null}
            {nextReport && workspace.access.canContribute ? <Link href={`/projects/${projectId}/reports`} className="button-primary button-compact"><UiText>{"보고서 제출"}</UiText></Link> : null}
          </>
        )}
      />

      <KpiStrip items={[
        { label: "보고서 제출", value: reportRows.length ? submittedReports : null, unit: ` / ${reportRows.length}건`, note: reportRows.length ? (overdueReports ? <span className="text-[var(--danger)]"><UiText>{`기한 초과 ${overdueReports}건`}</UiText></span> : <UiText>{"기한 초과 0건"}</UiText>) : <UiText>{"보고서 일정 없음"}</UiText> },
        { label: "할 일 완료", value: workspace.completedTaskCount, unit: ` / ${workspace.taskCount}개` },
        { label: "팀원", value: workspace.memberCount, unit: "명" },
        { label: "수행 종료까지", value: Math.max(0, executionDaysLeft), unit: "일", note: <UiDate value={workspace.schedule.executionEndsAt} /> },
      ]} />

      {/* 좁으면 두 칸 묶음을 풀고(contents) 차례(order)로 다시 쌓는다: 다음 할 일, 보고서, 일정, 팀, 공지. */}
      <div className="grid items-start gap-3.5 @min-[68rem]:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-3.5 @max-[68rem]:contents">
          <section aria-labelledby="next-action-title" className={`${cardClass} order-1`}>
            <CardHead
              id="next-action-title"
              title={<UiText>{"다음 할 일"}</UiText>}
              count={nextTask ? (
                <span className="inline-flex gap-1.5 align-middle">
                  <Pill tone={taskStatusView[nextTask.status].tone}>{taskStatusView[nextTask.status].label}</Pill>
                  {focusDeadlineState === "OVERDUE" ? <Pill tone="danger">{"기한 초과"}</Pill> : null}
                </span>
              ) : undefined}
              action={<HeadLink href={`/projects/${projectId}/tasks`}><UiText>{"할 일 전체 보기"}</UiText></HeadLink>}
            />
            <div className="px-5 pb-5">
              {nextTask ? (
                <>
                  <h3 className="text-base font-semibold leading-6 text-[var(--ink)]"><UiText>{nextTask.title}</UiText></h3>
                  <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-[0.8125rem]">
                    <div className="flex items-baseline gap-2">
                      <dt className="text-[var(--muted)]"><UiText>{"완료 예정"}</UiText></dt>
                      <dd className={`tabular-nums ${focusDeadlineState === "OVERDUE" ? "font-medium text-[var(--danger)]" : "text-[var(--ink)]"}`}>
                        <time dateTime={nextTask.dueAt.toISOString()}><UiDate value={nextTask.dueAt} mode="date" /></time>
                        <span className="ml-1.5 text-[var(--muted)]"><UiText>{daysLabel(daysUntil(nextTask.dueAt, now))}</UiText></span>
                      </dd>
                    </div>
                    <div className="flex min-w-0 items-baseline gap-2">
                      <dt className="shrink-0 text-[var(--muted)]"><UiText>{"담당자"}</UiText></dt>
                      <dd className="break-words text-[var(--ink)]">
                        <UiText>{nextTask.assignees.map(({ name }) => name).join(", ") || "미지정"}</UiText>
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-[var(--ink)]">
                    <UiText>{workspace.status === "COMPLETED" ? "프로젝트 종료" : workspace.taskCount > 0 ? "모든 할 일 완료" : "등록된 할 일이 없습니다"}</UiText>
                  </h3>
                  {workspace.taskCount === 0 ? <p className="mt-1 text-[0.8125rem] text-[var(--muted)]"><UiText>{"첫 할 일과 완료 예정일, 담당자를 정해 주세요."}</UiText></p> : null}
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="schedule-title" className={`${cardClass} order-3`}>
            <CardHead id="schedule-title" title={<UiText>{"프로그램 일정"}</UiText>} count={<UiText>{"사업 기간과 보고서 마감"}</UiText>} />
            <div className="px-5 pb-4">
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
                <span aria-hidden="true" />
                <div className="relative h-5 text-xs text-[var(--muted)]">
                  {timeline.ticks.map((tick, index) => (
                    <span key={tick.key} className={`absolute top-0 -translate-x-1/2 whitespace-nowrap ${index % 2 ? "@max-[40rem]:hidden" : ""}`} style={{ left: `${tick.left}%` }}>
                      {tick.month}<UiText>{"월"}</UiText>
                    </span>
                  ))}
                  {timeline.showToday ? (
                    <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap bg-[var(--surface)] px-1 font-medium text-[var(--accent-ink)]" style={{ left: `${timeline.todayLeft}%` }}><UiText>{"오늘"}</UiText></span>
                  ) : null}
                </div>
              </div>
              {[...timeline.rows.map((row) => ({ ...row, marks: false })), ...(timeline.marks.length ? [{ label: "보고서 마감", left: 0, width: 0, state: "UPCOMING" as const, marks: true }] : [])].map((row) => (
                <div key={row.label} className="grid h-10 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 [&+div]:border-t [&+div]:border-[var(--line)]">
                  <span className="truncate text-[0.8125rem] text-[var(--ink)]"><UiText>{row.label}</UiText></span>
                  <div className="relative h-10">
                    {row.marks
                      ? timeline.marks.map((mark) => <span key={mark.key} aria-hidden="true" className={`absolute top-3 h-4 w-1 -translate-x-1/2 rounded-sm ${mark.past ? "bg-[#9ca3af]" : "bg-[var(--primary)]"}`} style={{ left: `${mark.left}%` }} />)
                      : <span aria-hidden="true" className={`absolute top-[0.9375rem] h-2.5 rounded-[3px] ${laneClass[row.state]}`} style={{ left: `${row.left}%`, width: `${row.width}%` }} />}
                    {timeline.showToday ? <span aria-hidden="true" className="absolute inset-y-0 w-px bg-[var(--accent-ink)]" style={{ left: `${timeline.todayLeft}%` }} /> : null}
                  </div>
                </div>
              ))}
              <p className="sr-only">
                {schedule.map(([label, start, end]) => `${label} ${monthDay.format(start)}부터 ${monthDay.format(end)}까지`).join(", ")}
              </p>
            </div>
          </section>

          <div className="order-5 min-w-0">
          <ProgramAnnouncementRail
            announcements={announcements}
            manageableAnnouncementIds={announcements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id)}
            deleteControls={announcementDeleteControls(announcements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id), `/projects/${projectId}`)}
            returnHref={`/projects/${projectId}`}
          />
          </div>
        </div>

        <div className="grid min-w-0 gap-3.5 @max-[68rem]:contents">
          <section aria-labelledby="reports-title" className={`${cardClass} order-2`}>
            <CardHead
              id="reports-title"
              title={<UiText>{"보고서"}</UiText>}
              count={reportRows.length ? <>{submittedReports} / {reportRows.length}<UiText>{"건"}</UiText></> : undefined}
              action={<HeadLink href={`/projects/${projectId}/reports`}><UiText>{"보고서 전체"}</UiText></HeadLink>}
            />
            {reportRows.length ? (
              <div className="px-5 pb-3">
                <UiDiv role="progressbar" aria-label="보고서 제출률" aria-valuemin={0} aria-valuemax={reportRows.length} aria-valuenow={submittedReports} className="h-1.5 overflow-hidden rounded-full bg-[var(--accent-subtle)]">
                  <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${(submittedReports / reportRows.length) * 100}%` }} />
                </UiDiv>
                <div className="mt-1 flex justify-between text-xs tabular-nums text-[var(--muted)]"><span>0</span><span>{reportRows.length}<UiText>{"건"}</UiText></span></div>
                <ul className="mt-2">
                  {visibleReports.map((report) => (
                    <li key={report.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 text-[0.8125rem] [&+li]:border-t [&+li]:border-[var(--line)]">
                      <span className="min-w-0">
                        <span className="block truncate text-[var(--ink)]"><UiText>{report.titleSnapshot}</UiText></span>
                        <span className="block text-xs tabular-nums text-[var(--muted)]"><UiDate value={report.dueAt} /></span>
                      </span>
                      {report.submitted
                        ? <Pill>{"제출"}</Pill>
                        : report.overdue
                          ? <Pill tone="danger">{"기한 초과"}</Pill>
                          : <span className="whitespace-nowrap text-xs text-[var(--muted)]"><UiText>{daysLabel(daysUntil(report.dueAt, now))}</UiText></span>}
                    </li>
                  ))}
                </ul>
                {reportRows.length > visibleReports.length ? <p className="border-t border-[var(--line)] pt-2 text-xs text-[var(--muted)]"><UiText>{`나머지 ${reportRows.length - visibleReports.length}건은 보고서 화면에 있습니다.`}</UiText></p> : null}
              </div>
            ) : <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"등록된 보고서 일정이 없습니다"}</UiText></p>}
          </section>

          <section aria-labelledby="team-title" className={`${cardClass} order-4`}>
            <CardHead id="team-title" title={<UiText>{"팀"}</UiText>} count={<UiText>{`${workspace.memberCount}명`}</UiText>} action={<HeadLink href={`/projects/${projectId}/team`}><UiText>{"팀 관리"}</UiText></HeadLink>} />
            <TeamRosterSummary
              advisorEnabled={workspace.advisorEnabled}
              professor={workspace.professor}
              assistants={workspace.assistants}
              members={workspace.members}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
