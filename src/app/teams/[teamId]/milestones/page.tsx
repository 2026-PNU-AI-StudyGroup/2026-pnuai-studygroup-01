import type { Metadata } from "next";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/team-workspace-data";
import { MilestoneForm, MilestoneStatusForm } from "@/app/teams/[teamId]/workspace-forms";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 마일스톤" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const milestoneStatus = { TODO: ["할 일", "neutral"], IN_PROGRESS: ["진행 중", "warning"], DONE: ["완료", "success"] } as const;

export default async function TeamMilestonesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 등록된 마일스톤이 없습니다." : actor.role === "PROFESSOR" ? "팀원이 마일스톤을 등록하면 이곳에서 진행 상태를 확인할 수 있습니다." : "첫 목표와 완료 예정일을 등록해 프로젝트의 리듬을 만드세요.";
  return <section aria-labelledby="milestones-title" className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">계획</p><h2 id="milestones-title" className="mt-1 text-3xl font-bold">마일스톤</h2><p className="muted mt-2 text-sm">프로젝트 목표와 완료 예정일, 진행 상태를 관리합니다.</p></div><span className="muted text-sm">완료 {workspace.completedMilestoneCount} / {workspace.milestoneCount}</span></div>{workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneForm teamId={workspace.id} /> : null}{workspace.milestones.length === 0 ? <EmptyState title="마일스톤이 없습니다" description={emptyDescription} /> : <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{workspace.milestones.map((milestone) => <li key={milestone.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex items-start gap-3"><StatusBadge tone={milestoneStatus[milestone.status][1]}>{milestoneStatus[milestone.status][0]}</StatusBadge><div><p className="font-semibold">{milestone.title}</p><p className="muted mt-1 text-xs">{koreanDate.format(milestone.dueAt)}까지</p></div></div>{workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneStatusForm teamId={workspace.id} milestoneId={milestone.id} status={milestone.status} /> : null}</li>)}</ul>}</section>;
}
