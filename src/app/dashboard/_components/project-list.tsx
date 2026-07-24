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
    <header className={`${styles.hero} overflow-hidden rounded-[var(--radius-panel)] border border-[#dbe3fb]`}>
      <div className="grid min-h-[19rem] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.8fr)]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
          <p className="text-sm font-extrabold tracking-[0.08em] text-[var(--primary)]">PROJECT WORKSPACE</p>
          <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-black leading-[1.08] tracking-[-0.05em] text-[var(--ink)]">{title}</h1>
          <p className="muted mt-5 max-w-xl text-base leading-7 sm:text-lg">{description}</p>
          <div className="mt-7"><DashboardActions role={role} /></div>
        </div>

        <div className="relative hidden min-h-[19rem] items-center justify-center overflow-hidden px-10 lg:flex" aria-hidden="true">
          <span className={`${styles.orbit} ${styles.orbitLarge}`} />
          <span className={`${styles.orbit} ${styles.orbitSmall}`} />
          <span className="absolute left-[9%] top-[22%] size-9 rotate-12 rounded-lg bg-white/80 shadow-[0_10px_22px_rgb(47_91_234_/_0.14)]" />
          <span className="absolute bottom-[16%] right-[7%] size-12 -rotate-6 rounded-xl bg-[#b8c8ff] shadow-[0_12px_25px_rgb(47_91_234_/_0.2)]" />
          <div className={`${styles.snapshot} relative z-10 w-full max-w-sm rounded-[var(--radius-panel)] border border-[#cbd7fb] bg-white p-6`}>
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">전체 진행률</p>
                <p className="mt-2 text-4xl font-black tracking-[-0.04em] text-[var(--ink)]">{summary.progress}<span className="ml-1 text-xl">%</span></p>
              </div>
              <div className="grid size-14 place-items-center rounded-full border-[7px] border-[var(--primary-subtle)] text-sm font-black text-[var(--primary)]">{summary.activeCount}</div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--primary-subtle)]">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${summary.progress}%` }} />
            </div>
            <div className="mt-6 grid grid-cols-3 divide-x divide-[var(--line)] border-t border-[var(--line)] pt-5 text-center">
              <div><strong className="block text-xl">{summary.activeCount}</strong><span className="muted mt-1 block text-xs">진행 중</span></div>
              <div><strong className="block text-xl">{summary.completedMilestoneCount}</strong><span className="muted mt-1 block text-xs">완료 단계</span></div>
              <div><strong className="block text-xl">{summary.closedCount}</strong><span className="muted mt-1 block text-xs">완료 기록</span></div>
            </div>
          </div>
        </div>
      </div>
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
    <li className={`${styles.activeProject} rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:p-8`}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,.85fr)_minmax(22rem,1fr)] lg:items-center">
        <div>
          <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
          <h3 className="mt-4 text-2xl font-black tracking-[-0.035em] text-[var(--ink)]">{team.name}</h3>
          <p className="muted mt-2 text-base leading-6">{team.topicTitle} <span aria-hidden="true">·</span> 팀원 {team.memberCount}명</p>
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="muted text-sm font-semibold">마일스톤</p>
              <p className="mt-1 text-base font-bold">{team.completedMilestoneCount}/{team.milestoneCount} 완료</p>
            </div>
            <strong className="text-xl font-black text-[var(--primary)]">{progress}%</strong>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--primary-subtle)]" role="progressbar" aria-label={`${team.name} 마일스톤 진행률`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-5 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-[var(--ink)]">다음 안내</p>
          <p className="muted mt-1 text-sm leading-6">{projectGuidance(team, progress)}</p>
        </div>
        <div className="shrink-0"><ProjectActions role={role} team={team} /></div>
      </div>
    </li>
  );
}

function ClosedProjectItem({ role, team }: { role: UserRole; team: TeamListItem }) {
  return (
    <li className={`${styles.closedProject} grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6`}>
      <div>
        <h3 className="text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)]">{team.name}</h3>
        <p className="muted mt-1 text-sm">{team.topicTitle} <span aria-hidden="true">·</span> 팀원 {team.memberCount}명</p>
      </div>
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--success)]">
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
    <div className="space-y-12">
      {activeTeams.length > 0 ? (
        <section aria-labelledby="active-project-list-heading">
          <SectionHeading heading="진행 중 프로젝트" count={activeTeams.length} headingId="active-project-list-heading" />
          <ul className="space-y-5">
            {activeTeams.map((team) => <ActiveProjectItem key={team.id} role={role} team={team} />)}
          </ul>
        </section>
      ) : null}

      {closedTeams.length > 0 ? (
        <section aria-labelledby="closed-project-list-heading">
          <SectionHeading heading="완료한 프로젝트" count={closedTeams.length} headingId="closed-project-list-heading" />
          <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
            {closedTeams.map((team) => <ClosedProjectItem key={team.id} role={role} team={team} />)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({ heading, count, headingId }: { heading: string; count: number; headingId: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 id={headingId} className="text-2xl font-black tracking-[-0.035em] text-[var(--ink)]">{heading}</h2>
      <span className="grid min-h-7 min-w-7 place-items-center rounded-md bg-[var(--surface-subtle)] px-2 text-sm font-extrabold text-[var(--muted)]">{count}</span>
    </div>
  );
}
