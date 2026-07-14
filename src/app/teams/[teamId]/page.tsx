import { notFound, redirect } from "next/navigation";

import { confirmTeamAction } from "@/app/teams/[teamId]/actions";
import { MilestoneForm, MilestoneStatusForm, ProgressUpdateForm } from "@/app/teams/[teamId]/workspace-forms";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamNotFoundError, TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const milestoneStatus = { TODO: ["할 일", "neutral"], IN_PROGRESS: ["진행 중", "warning"], DONE: ["완료", "success"] } as const;

export default async function TeamWorkspacePage({ params }: { params: Promise<{ teamId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { teamId } = await params;
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const service = new TeamWorkspaceService(repository, repository, repository);
  let workspace: TeamWorkspace;
  try { workspace = await service.get(actor, teamId); } catch (error) { if (error instanceof TeamNotFoundError) notFound(); throw error; }
  const progress = workspace.milestoneCount === 0 ? 0 : Math.round((workspace.completedMilestoneCount / workspace.milestoneCount) * 100);

  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/dashboard">
      <main className="content-shell space-y-12">
        <PageHeader eyebrow="Team workspace" title={workspace.name} description={`${workspace.topicTitle} · 지도교수 ${workspace.professorName}`} actions={<div className="flex items-center gap-3">{workspace.status === "FORMING" && actor.role !== "STUDENT" ? <form action={confirmTeamAction}><input type="hidden" name="teamId" value={workspace.id} /><button className="button-primary">팀 확정</button></form> : <StatusBadge tone={workspace.status === "CONFIRMED" ? "success" : "neutral"}>{workspace.status === "CONFIRMED" ? "확정 팀" : "구성 중"}</StatusBadge>}<div className="w-48"><ProgressBar value={progress} /></div></div>} />
        <section aria-labelledby="members-title" className="border-y border-[var(--line)] py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3"><h2 id="members-title" className="text-sm font-bold">팀원 {workspace.members.length}명</h2>{workspace.members.map((member) => <span key={member.id} className="text-sm"><strong>{member.name}</strong><span className="muted ml-2 hidden sm:inline">{member.email}</span></span>)}</div>
        </section>
        <div className="grid gap-14 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] xl:items-start">
          <section aria-labelledby="milestones-title">
            <div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">Plan</p><h2 id="milestones-title" className="mt-1 text-xl font-bold">마일스톤</h2></div><span className="muted text-sm">완료 {workspace.completedMilestoneCount} / {workspace.milestoneCount}</span></div>
            <MilestoneForm teamId={workspace.id} />
            {workspace.milestones.length === 0 ? <div className="mt-5"><EmptyState title="마일스톤이 없습니다" description="첫 목표와 완료 예정일을 등록해 프로젝트의 리듬을 만드세요." /></div> : <ul className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">{workspace.milestones.map((milestone) => <li key={milestone.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex items-start gap-3"><StatusBadge tone={milestoneStatus[milestone.status][1]}>{milestoneStatus[milestone.status][0]}</StatusBadge><div><p className="font-semibold">{milestone.title}</p><p className="muted mt-1 text-xs">{koreanDate.format(milestone.dueAt)}까지</p></div></div><MilestoneStatusForm teamId={workspace.id} milestoneId={milestone.id} status={milestone.status} /></li>)}</ul>}
          </section>
          <section aria-labelledby="updates-title">
            <div className="mb-5"><p className="eyebrow">Log</p><h2 id="updates-title" className="mt-1 text-xl font-bold">진행 기록</h2></div>
            <ProgressUpdateForm teamId={workspace.id} />
            {workspace.progressUpdates.length === 0 ? <p className="muted mt-5 border-t border-[var(--line)] py-7 text-sm">아직 진행 기록이 없습니다.</p> : <ol className="mt-6 border-l border-[var(--line)] pl-5">{workspace.progressUpdates.map((update) => <li key={update.id} className="relative pb-8 before:absolute before:-left-[1.45rem] before:top-1 before:size-2 before:rounded-full before:bg-[var(--teal)]"><div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]"><strong className="text-[var(--ink)]">{update.authorName}</strong><time>{koreanDate.format(update.createdAt)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{update.content}</p>{update.risk ? <p className="mt-3 border-l-2 border-[var(--warning)] pl-3 text-sm text-[#794636]">위험 · {update.risk}</p> : null}{update.nextAction ? <p className="mt-2 text-sm text-[var(--teal-dark)]">다음 행동 · {update.nextAction}</p> : null}</li>)}</ol>}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
