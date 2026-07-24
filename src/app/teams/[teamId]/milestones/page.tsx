import type { Metadata } from "next";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { MilestoneForm, MilestoneStatusForm } from "@/app/teams/[teamId]/_components/milestone-forms";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 마일스톤" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const milestoneStatus = { TODO: ["할 일", "neutral"], IN_PROGRESS: ["진행 중", "warning"], DONE: ["완료", "success"] } as const;

export default async function TeamMilestonesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 등록된 마일스톤이 없습니다." : actor.role === "PROFESSOR" ? "팀원이 마일스톤을 등록하면 이곳에서 진행 상태를 확인할 수 있습니다." : "첫 목표와 완료 예정일을 등록해 프로젝트의 리듬을 만드세요.";
  return (
    <section aria-labelledby="milestones-title" className="space-y-8">
      <header className="border-b border-[var(--line)] pb-7">
        <p className="eyebrow">계획</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 id="milestones-title" className="text-3xl font-black tracking-[-0.04em]">마일스톤</h1><p className="muted mt-2">목표와 완료 예정일을 정하고 진행 상태를 관리합니다.</p></div><p className="text-sm"><strong className="text-[var(--primary)]">{workspace.completedMilestoneCount}</strong> / {workspace.milestoneCount} 완료</p></div>
      </header>
      {workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneForm teamId={workspace.id} /> : null}
      {workspace.milestones.length === 0 ? <EmptyState title="마일스톤이 없습니다" description={emptyDescription} /> : (
        <div><div className="hidden grid-cols-[7rem_minmax(0,1fr)_10rem_13rem] border-b border-[var(--primary)] px-2 pb-3 text-xs font-bold text-[var(--muted)] md:grid"><span>상태</span><span>마일스톤</span><span>완료 예정</span><span className="text-right">변경</span></div>
          <ul className="divide-y divide-[var(--line)] border-b border-[var(--line)]">{workspace.milestones.map((milestone) => <li key={milestone.id} className="grid gap-4 px-2 py-5 md:grid-cols-[7rem_minmax(0,1fr)_10rem_13rem] md:items-center"><div><StatusBadge tone={milestoneStatus[milestone.status][1]}>{milestoneStatus[milestone.status][0]}</StatusBadge></div><p className="font-semibold">{milestone.title}</p><time className="muted text-sm" dateTime={milestone.dueAt.toISOString()}>{koreanDate.format(milestone.dueAt)}</time><div className="md:justify-self-end">{workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneStatusForm teamId={workspace.id} milestoneId={milestone.id} status={milestone.status} /> : null}</div></li>)}</ul>
        </div>
      )}
    </section>
  );
}
