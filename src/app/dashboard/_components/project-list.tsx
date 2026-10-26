import Link from "next/link";

import styles from "@/app/dashboard/_components/project-list.module.css";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";
import {
  calculateReportSubmissionRate,
  hasReportSchedule,
} from "@/modules/team/domain/project-progress";
import { presentTasks, taskDeadlineState } from "@/modules/team/ui/task-presentation";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";

function ProjectCard({
  role,
  team,
  now,
}: {
  role: UserRole;
  team: TeamListItem;
  now: Date;
}) {
  const titleId = `project-${team.id}-title`;
  const actionId = `project-${team.id}-action`;
  const status = teamStatusPresentation[team.status];
  // 작업 공간과 같은 규칙으로 고른다. 따로 고르면 카드는 앞으로 할 일처럼 보이는데
  // 들어가면 기한 초과로 뜨는 어긋남이 생긴다.
  const task = presentTasks(team.tasks, now).focus;
  const overdue = task ? taskDeadlineState(task, now) === "OVERDUE" : false;
  const progress = calculateReportSubmissionRate(
    team.submittedReportCount,
    team.reportCount,
  );
  const reportScheduleAvailable = hasReportSchedule(team.reportCount);
  const actionLabel = role === "PROFESSOR"
    ? "프로젝트 열기"
    : team.status === "COMPLETED"
      ? "완료 프로젝트 열기"
      : "프로젝트 열기";

  return (
    <article className={styles.projectCard} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
        <span><UiText>{"팀원"}</UiText> {team.memberCount}<UiText>{"명"}</UiText></span>
      </div>

      <div className={styles.projectIdentity}>
        <p className={styles.program}><UiText>{team.programName}</UiText></p>
        <h3 id={titleId}><UiText>{team.topicTitle}</UiText></h3>
        <p className={styles.teamName}><UiText>{team.name}</UiText></p>
      </div>

      <div className={styles.progress}>
        {reportScheduleAvailable ? (
          <>
            <div>
              <span><UiText>{"보고서 제출률"}</UiText></span>
              <strong>{progress}%</strong>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`${team.name} 보고서 제출률`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>{team.submittedReportCount} / {team.reportCount} <UiText>{"보고서 제출"}</UiText></p>
          </>
        ) : (
          <p><UiText>{"등록된 보고서 일정이 없습니다"}</UiText></p>
        )}
      </div>

      <div className={styles.nextTask}>
        <span>
          <UiText>{team.status === "COMPLETED" ? "마지막 현황" : "다음 할 일"}</UiText>
          {overdue ? <StatusBadge tone="danger"><UiText>{"기한 초과"}</UiText></StatusBadge> : null}
        </span>
        {task ? (
          <>
            <strong><UiText>{task.title}</UiText></strong>
            <p>
              <UiText>{task.assignees.map(({ name }) => name).join(", ") || "담당자 미정"}</UiText>
              <time dateTime={task.dueAt.toISOString()} data-overdue={overdue || undefined}><UiDate value={task.dueAt} mode="date" /></time>
            </p>
          </>
        ) : (
          <strong><UiText>{team.taskCount > 0 ? "모든 할 일 완료" : "등록된 할 일 없음"}</UiText></strong>
        )}
      </div>

      <Link
        href={`/projects/${team.id}`}
        aria-labelledby={`${titleId} ${actionId}`}
        className={styles.cardLink}
      >
        <span id={actionId} className="sr-only"><UiText>{actionLabel}</UiText></span>
      </Link>
    </article>
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

  return (
    <section
      aria-labelledby={`${view}-projects-title`}
      className={styles.projectSection}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2 id={`${view}-projects-title`}>
            <UiText>{view === "completed" ? "완료한 프로젝트" : view === "active" ? "진행 중 프로젝트" : "프로젝트"}</UiText>
          </h2>
          <p>
            <UiText>{view === "completed" ? "종료된 프로젝트와 결과를 확인합니다." : "프로젝트 일정과 진행 현황을 확인합니다."}</UiText>
          </p>
        </div>
        <span>{visibleTeams.length}<UiText>{"개"}</UiText></span>
      </div>
      <div className={styles.projectGrid}>
        {visibleTeams.map((team) => (
          <ProjectCard key={team.id} role={role} team={team} now={now} />
        ))}
      </div>
    </section>
  );
}
