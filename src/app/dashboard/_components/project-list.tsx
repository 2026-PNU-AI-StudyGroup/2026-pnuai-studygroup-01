import Link from "next/link";

import styles from "@/app/dashboard/_components/project-list.module.css";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";
import {
  calculateProjectProgress,
  hasMilestonePlan,
} from "@/modules/team/domain/project-progress";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";

function nextMilestone(team: TeamListItem) {
  return [...team.milestones]
    .filter(({ status }) => status !== "DONE")
    .sort((left, right) => {
      const statusOrder = Number(right.status === "IN_PROGRESS") -
        Number(left.status === "IN_PROGRESS");
      return statusOrder || left.dueAt.getTime() - right.dueAt.getTime();
    })[0];
}

function ProjectCard({
  role,
  team,
}: {
  role: UserRole;
  team: TeamListItem;
}) {
  const status = teamStatusPresentation[team.status];
  const milestone = nextMilestone(team);
  const progress = calculateProjectProgress(
    team.completedMilestoneCount,
    team.milestoneCount,
  );
  const milestonePlanAvailable = hasMilestonePlan(team.milestoneCount);
  const actionLabel = role === "PROFESSOR"
    ? "프로젝트 열기"
    : team.status === "CLOSED"
      ? "완료 프로젝트 열기"
      : "프로젝트 열기";

  return (
    <article className={styles.projectCard} aria-labelledby={`project-${team.id}-title`}>
      <div className={styles.cardHeader}>
        <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
        <span><UiText>{"팀원"}</UiText> {team.memberCount}<UiText>{"명"}</UiText></span>
      </div>

      <div>
        <h3 id={`project-${team.id}-title`}><UiText>{team.name}</UiText></h3>
        <p className={styles.topic}><UiText>{team.topicTitle}</UiText></p>
      </div>

      <div className={styles.progress}>
        {milestonePlanAvailable ? (
          <>
            <div>
              <span><UiText>{"프로젝트 진행률"}</UiText></span>
              <strong>{progress}%</strong>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`${team.name} 마일스톤 완료율`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>{team.completedMilestoneCount} / {team.milestoneCount} <UiText>{"마일스톤 완료"}</UiText></p>
          </>
        ) : (
          <p><UiText>{"등록된 마일스톤이 없습니다"}</UiText></p>
        )}
      </div>

      <div className={styles.nextMilestone}>
        <span><UiText>{team.status === "CLOSED" ? "마지막 현황" : "다음 마일스톤"}</UiText></span>
        {milestone ? (
          <>
            <strong><UiText>{milestone.title}</UiText></strong>
            <p>
              <UiText>{milestone.assignees.map(({ name }) => name).join(", ") || "담당자 미정"}</UiText>
              <time dateTime={milestone.dueAt.toISOString()}><UiDate value={milestone.dueAt} mode="date" /></time>
            </p>
          </>
        ) : (
          <strong><UiText>{team.milestoneCount > 0 ? "모든 마일스톤 완료" : "등록된 마일스톤 없음"}</UiText></strong>
        )}
      </div>

      <Link href={`/teams/${team.id}`} className={styles.cardAction}>
        <UiText>{actionLabel}</UiText>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function ProjectList({
  role,
  teams,
  view = "all",
}: {
  role: UserRole;
  teams: TeamListItem[];
  view?: "all" | "active" | "completed";
}) {
  const visibleTeams = teams.filter((team) => {
    if (view === "active") return team.status !== "CLOSED";
    if (view === "completed") return team.status === "CLOSED";
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
            <UiText>{view === "completed" ? "종료된 프로젝트와 결과를 확인합니다." : "핵심 현황을 확인하고 작업 공간으로 이동합니다."}</UiText>
          </p>
        </div>
        <span>{visibleTeams.length}<UiText>{"개"}</UiText></span>
      </div>
      <div className={styles.projectGrid}>
        {visibleTeams.map((team) => (
          <ProjectCard key={team.id} role={role} team={team} />
        ))}
      </div>
    </section>
  );
}
