import Link from "next/link";

import { cardClass, CardHead, daysLabel, daysUntil, Pill, pillToneFor } from "@/modules/project-program/ui/work-screen";
import type { DashboardDeadline } from "@/app/dashboard/_lib/project-dashboard-view";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";
import {
  calculateReportSubmissionRate,
  hasReportSchedule,
} from "@/modules/team/domain/project-progress";
import { presentTasks, taskDeadlineState } from "@/modules/team/ui/task-presentation";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";

// 프로젝트, 팀, 보고서 제출, 다음 할 일, 상태. 목록 폭이 40rem 아래면 프로젝트 이름 밑으로 흐른다.
const rowGrid = "@min-[40rem]:grid-cols-[minmax(0,1fr)_8rem_9rem_minmax(0,12rem)_4.5rem]";

function ProjectRow({ role, team, now }: { role: UserRole; team: TeamListItem; now: Date }) {
  const titleId = `project-${team.id}-title`;
  const actionId = `project-${team.id}-action`;
  const status = teamStatusPresentation[team.status];
  // 작업 공간과 같은 규칙으로 고른다. 따로 고르면 목록은 앞으로 할 일처럼 보이는데
  // 들어가면 기한 초과로 뜨는 어긋남이 생긴다.
  const task = presentTasks(team.tasks, now).focus;
  const overdue = task ? taskDeadlineState(task, now) === "OVERDUE" : false;
  const progress = calculateReportSubmissionRate(team.submittedReportCount, team.reportCount);
  const actionLabel = role !== "PROFESSOR" && team.status === "COMPLETED" ? "완료 프로젝트 열기" : "프로젝트 열기";

  return (
    <li className={`group relative grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-[var(--line)] px-5 py-3 transition-colors hover:bg-[#fafbfc] @min-[40rem]:items-center ${rowGrid}`}>
      {/* 줄 전체가 프로젝트로 가는 손잡이다. 줄 안에 다른 버튼이 없어 겹치는 일이 없다. */}
      <Link href={`/projects/${team.id}`} aria-labelledby={`${titleId} ${actionId}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]">
        <span id={actionId} className="sr-only"><UiText>{actionLabel}</UiText></span>
      </Link>
      <div className="min-w-0">
        <h3 id={titleId} className="truncate text-sm font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--primary)]">
          <UiText>{team.topicTitle}</UiText>
        </h3>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]"><UiText>{team.programName}</UiText></p>
      </div>
      <p className="min-w-0 truncate text-[0.8125rem] text-[var(--ink)]">
        <UiText>{team.name}</UiText>
        <span className="text-[var(--muted)]">, <span className="tabular-nums">{team.memberCount}</span><UiText>{"명"}</UiText></span>
      </p>
      <div className="flex items-center gap-2.5 text-[0.8125rem]">
        {hasReportSchedule(team.reportCount) ? (
          <>
            <div
              role="progressbar"
              aria-label={`${team.name} 보고서 제출률`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 w-16 flex-none overflow-hidden rounded-full bg-[var(--accent-subtle)]"
            >
              <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${progress}%` }} />
            </div>
            <span className="whitespace-nowrap tabular-nums text-[var(--ink)]">{team.submittedReportCount} / {team.reportCount}<UiText>{"건"}</UiText></span>
          </>
        ) : <span className="text-[var(--muted)]"><UiText>{"보고서 없는 사업"}</UiText></span>}
      </div>
      <div className="min-w-0 text-[0.8125rem] leading-[1.125rem]">
        {task ? (
          <>
            <p className="truncate text-[var(--ink)]"><UiText>{task.title}</UiText></p>
            <p className="flex items-center gap-1.5 text-xs tabular-nums text-[var(--muted)]">
              <time dateTime={task.dueAt.toISOString()}><UiDate value={task.dueAt} mode="date" /></time>
              {overdue ? <span className="text-[var(--danger)]"><UiText>{"기한 초과"}</UiText></span> : <UiText>{daysLabel(daysUntil(task.dueAt, now))}</UiText>}
            </p>
          </>
        ) : <span className="text-[var(--muted)]"><UiText>{team.taskCount > 0 ? "모든 할 일 완료" : "등록된 할 일 없음"}</UiText></span>}
      </div>
      <div><Pill tone={pillToneFor(status.tone)}>{status.label}</Pill></div>
    </li>
  );
}

export function ProjectList({
  role,
  teams,
  view = "all",
  now = new Date(),
}: {
  role: UserRole;
  teams: TeamListItem[];
  view?: "all" | "active" | "completed";
  now?: Date;
}) {
  const visibleTeams = teams.filter((team) => {
    if (view === "active") return team.status === "IN_PROGRESS";
    if (view === "completed") return team.status === "COMPLETED";
    return true;
  });

  if (visibleTeams.length === 0) return null;

  const title = view === "completed" ? "완료한 프로젝트" : view === "active" ? "진행 중 프로젝트" : role === "PROFESSOR" ? "지도 중인 프로젝트" : "참여한 프로젝트";
  return (
    <section aria-labelledby={`${view}-projects-title`} className={`${cardClass} @container`}>
      <CardHead id={`${view}-projects-title`} title={<UiText>{title}</UiText>} count={<>{visibleTeams.length}<UiText>{"개"}</UiText></>} />
      <div aria-hidden="true" className={`hidden h-9 items-center gap-x-4 px-5 text-xs text-[var(--muted)] @min-[40rem]:grid ${rowGrid}`}>
        <span><UiText>{"프로젝트"}</UiText></span>
        <span><UiText>{"팀"}</UiText></span>
        <span><UiText>{"보고서 제출"}</UiText></span>
        <span><UiText>{"다음 할 일"}</UiText></span>
        <span><UiText>{"상태"}</UiText></span>
      </div>
      <ul>
        {visibleTeams.map((team) => <ProjectRow key={team.id} role={role} team={team} now={now} />)}
      </ul>
    </section>
  );
}

/** 여러 프로젝트에 걸친 마감 목록. 지난 마감은 빨간 글자로 남은 날 대신 지난 날을 적는다. */
export function DeadlineList({ deadlines, now, limit = 6 }: { deadlines: DashboardDeadline[]; now: Date; limit?: number }) {
  const visible = deadlines.slice(0, limit);
  return (
    <section aria-labelledby="deadlines-title" className={cardClass}>
      <CardHead id="deadlines-title" title={<UiText>{"다가오는 마감"}</UiText>} count={<>{deadlines.length}<UiText>{"건"}</UiText></>} />
      {visible.length ? (
        <ul>
          {visible.map((deadline) => {
            const days = daysUntil(deadline.dueAt, now);
            const href = `/projects/${deadline.projectId}/${deadline.kind === "REPORT" ? "reports" : "tasks"}`;
            return (
              <li key={deadline.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--line)] px-5 py-2.5 transition-colors hover:bg-[#fafbfc] sm:grid-cols-[5rem_minmax(0,1fr)_4.5rem_4rem]">
                <div className="text-[0.8125rem] leading-[1.125rem] tabular-nums">
                  <p className="text-[var(--ink)]"><UiDate value={deadline.dueAt} mode="date" /></p>
                  <p className={`text-xs ${days < 0 ? "font-medium text-[var(--danger)]" : days <= 3 ? "font-medium text-[var(--accent-ink)]" : "text-[var(--muted)]"}`}><UiText>{daysLabel(days)}</UiText></p>
                </div>
                <div className="min-w-0 leading-[1.125rem]">
                  <p className="truncate text-sm font-medium text-[var(--ink)]"><UiText>{deadline.title}</UiText></p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    <UiText>{deadline.projectTitle}</UiText>
                    {deadline.assignees.length ? <>, <UiText>{`맡은 사람 ${deadline.assignees.join(", ")}`}</UiText></> : null}
                  </p>
                </div>
                <span className="hidden sm:block"><Pill tone={deadline.kind === "REPORT" ? "accent" : "plain"}>{deadline.kind === "REPORT" ? "보고서" : "할 일"}</Pill></span>
                <Link href={href} className="justify-self-end whitespace-nowrap text-[0.8125rem] font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]">
                  <UiText>{deadline.kind === "REPORT" ? "제출" : "열기"}</UiText>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"남은 마감이 없습니다"}</UiText></p>}
      {deadlines.length > visible.length ? <p className="border-t border-[var(--line)] px-5 py-2.5 text-xs text-[var(--muted)]"><UiText>{`나머지 ${deadlines.length - visible.length}건은 각 프로젝트의 할 일과 보고서 화면에 있습니다.`}</UiText></p> : null}
    </section>
  );
}
