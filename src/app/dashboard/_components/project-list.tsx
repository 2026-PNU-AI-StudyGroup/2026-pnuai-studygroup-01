import Link from "next/link";

import styles from "@/app/dashboard/_components/project-list.module.css";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const statusPresentation = {
  FORMING: { label: "구성 중", tone: "neutral" },
  CONFIRMED: { label: "진행 중", tone: "info" },
  CLOSED: { label: "완료", tone: "success" },
} as const;

function milestoneProgress(team: TeamListItem): number {
  if (team.milestoneCount === 0) return 0;
  return Math.round((team.completedMilestoneCount / team.milestoneCount) * 100);
}

function projectGuidance(team: TeamListItem, progress: number): string {
  if (team.status === "FORMING") return "팀 구성이 확정되면 프로젝트 작업 공간이 열립니다.";
  if (team.status === "CLOSED") return "지난 활동과 제출한 결과물을 다시 확인할 수 있습니다.";
  if (progress === 100) return "모든 마일스톤을 마쳤습니다. 최종 제출과 결과물을 확인하세요.";
  return "완료하지 않은 마일스톤부터 이어서 진행하세요.";
}

function dashboardSummary(teams: TeamListItem[]) {
  const activeTeams = teams.filter((team) => team.status !== "CLOSED");
  const closedTeams = teams.filter((team) => team.status === "CLOSED");
  const milestoneCount = activeTeams.reduce((total, team) => total + team.milestoneCount, 0);
  const completedMilestoneCount = activeTeams.reduce(
    (total, team) => total + team.completedMilestoneCount,
    0,
  );

  return {
    activeCount: activeTeams.length,
    closedCount: closedTeams.length,
    milestoneCount,
    completedMilestoneCount,
    progress: milestoneCount === 0
      ? 0
      : Math.round((completedMilestoneCount / milestoneCount) * 100),
  };
}

function DashboardActions({ role }: { role: UserRole }) {
  if (role === "PROFESSOR") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/professor/applications" className="button-secondary">지원 검토</Link>
        <Link href="/professor/topics" className="button-primary">주제 관리</Link>
      </div>
    );
  }

  return (
    <Link href={role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-primary">
      {role === "STUDENT" ? "새 프로젝트 찾기" : "주제 관리"}
    </Link>
  );
}

export function ProjectDashboardHero({ role, teams }: { role: UserRole; teams: TeamListItem[] }) {
  const summary = dashboardSummary(teams);
  const title = role === "PROFESSOR" ? "지도 프로젝트" : role === "ADMIN" ? "전체 프로젝트" : "내 프로젝트";
  const description = role === "PROFESSOR"
    ? "팀의 진행 상황을 살피고, 지도 의견과 보고서 결정을 한곳에서 관리하세요."
    : "진행 중인 프로젝트와 완료한 기록을 한눈에 확인하고 다음 작업을 이어가세요.";

  return (
    <header className={styles.overview}>
      <div className={styles.overviewHeading}>
        <div>
          <h1 className={styles.pageTitle}>{title}</h1>
          <p className={styles.pageDescription}>{description}</p>
        </div>
        <DashboardActions role={role} />
      </div>

      <dl className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.summaryCardPrimary}`}>
          <dt>진행 프로젝트</dt>
          <dd>{summary.activeCount}<span>개</span></dd>
          <p>지금 참여하고 있는 프로젝트</p>
        </div>
        <div className={styles.summaryCard}>
          <dt>마일스톤</dt>
          <dd>{summary.completedMilestoneCount}<span> / {summary.milestoneCount}</span></dd>
          <p>완료한 단계와 전체 단계</p>
        </div>
        <div className={styles.summaryCard}>
          <dt>전체 진행률</dt>
          <dd>{summary.progress}<span>%</span></dd>
          <div className={styles.summaryTrack} aria-hidden="true">
            <span style={{ width: `${summary.progress}%` }} />
          </div>
        </div>
        <div className={styles.summaryCard}>
          <dt>완료 기록</dt>
          <dd>{summary.closedCount}<span>개</span></dd>
          <p>마무리한 프로젝트</p>
        </div>
      </dl>
    </header>
  );
}

function ProjectActions({ role, team }: { role: UserRole; team: TeamListItem }) {
  if (role === "PROFESSOR" && team.status !== "CLOSED") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={`/teams/${team.id}/discussion`} className="button-primary">지도 의견</Link>
        <Link href={`/teams/${team.id}/reports`} className="button-secondary">보고서 관리</Link>
        <Link href={`/teams/${team.id}`} className="button-quiet">팀 개요</Link>
      </div>
    );
  }

  return (
    <Link href={`/teams/${team.id}`} className={team.status === "CLOSED" ? "button-secondary" : "button-primary"}>
      {team.status === "CLOSED" ? "프로젝트 보기" : "작업 이어가기"}
      <span aria-hidden="true" className="ml-2">→</span>
    </Link>
  );
}

function ActiveProjectItem({ role, team }: { role: UserRole; team: TeamListItem }) {
  const progress = milestoneProgress(team);
  const presentation = statusPresentation[team.status];

  return (
    <li className={styles.activeProject}>
      <div className={styles.projectIdentity}>
        <div className={styles.projectMark} aria-hidden="true">
          {team.name.trim().slice(0, 1)}
        </div>
        <div className={styles.projectTitle}>
          <div className={styles.projectStatusRow}>
            <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
            <span>팀원 {team.memberCount}명</span>
          </div>
          <h3>{team.name}</h3>
          <p>{team.topicTitle}</p>
        </div>
        <div className={styles.projectActions}><ProjectActions role={role} team={team} /></div>
      </div>

      <div className={styles.projectDetail}>
        <div>
          <div className={styles.progressLabel}>
            <span>마일스톤 {team.completedMilestoneCount}/{team.milestoneCount}</span>
            <strong>{progress}%</strong>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-label={`${team.name} 마일스톤 진행률`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className={styles.projectGuidance}>{projectGuidance(team, progress)}</p>
      </div>
    </li>
  );
}

function ClosedProjectItem({ role, team }: { role: UserRole; team: TeamListItem }) {
  return (
    <li className={styles.closedProject}>
      <div className={styles.closedIdentity}>
        <span className={styles.closedMark} aria-hidden="true">{team.name.trim().slice(0, 1)}</span>
        <div>
          <h3>{team.name}</h3>
          <p>{team.topicTitle} <span aria-hidden="true">·</span> 팀원 {team.memberCount}명</p>
        </div>
      </div>
      <div className={styles.completedStatus}>
        <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
        완료
      </div>
      <ProjectActions role={role} team={team} />
    </li>
  );
}

export function ProjectList({ role, teams }: { role: UserRole; teams: TeamListItem[] }) {
  const activeTeams = teams.filter((team) => team.status !== "CLOSED");
  const closedTeams = teams.filter((team) => team.status === "CLOSED");

  return (
    <div className={styles.projectSections}>
      {activeTeams.length > 0 ? (
        <section className={styles.projectSection} aria-labelledby="active-project-list-heading">
          <SectionHeading heading="진행 중 프로젝트" count={activeTeams.length} headingId="active-project-list-heading" />
          <ul className={styles.activeList}>
            {activeTeams.map((team) => <ActiveProjectItem key={team.id} role={role} team={team} />)}
          </ul>
        </section>
      ) : null}

      {closedTeams.length > 0 ? (
        <section className={styles.projectSection} aria-labelledby="closed-project-list-heading">
          <SectionHeading heading="완료한 프로젝트" count={closedTeams.length} headingId="closed-project-list-heading" />
          <ul className={styles.closedList}>
            {closedTeams.map((team) => <ClosedProjectItem key={team.id} role={role} team={team} />)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({ heading, count, headingId }: { heading: string; count: number; headingId: string }) {
  return (
    <div className={styles.sectionHeading}>
      <h2 id={headingId}>{heading}</h2>
      <span>{count}</span>
    </div>
  );
}
