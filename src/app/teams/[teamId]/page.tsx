import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  MilestoneForm,
  MilestoneStatusForm,
  ProgressUpdateForm,
} from "@/app/teams/[teamId]/workspace-forms";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  TeamNotFoundError,
  TeamWorkspaceService,
} from "@/modules/team/application/manage-team-workspace";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const koreanDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
});

export default async function TeamWorkspacePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { teamId } = await params;
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const service = new TeamWorkspaceService(repository, repository, repository);
  let workspace: TeamWorkspace;
  try {
    workspace = await service.get(actor, teamId);
  } catch (error) {
    if (error instanceof TeamNotFoundError) notFound();
    throw error;
  }
  const progress =
    workspace.milestoneCount === 0
      ? 0
      : Math.round(
          (workspace.completedMilestoneCount / workspace.milestoneCount) * 100,
        );

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-10 px-6 py-12">
      <header>
        <Link href="/dashboard" className="text-sm font-semibold text-blue-700">대시보드</Link>
        <h1 className="mt-3 text-3xl font-bold">{workspace.name}</h1>
        <p className="mt-2 text-zinc-600">{workspace.topicTitle} · 지도교수 {workspace.professorName} · 진행률 {progress}%</p>
      </header>
      <section><h2 className="mb-3 text-xl font-semibold">팀원</h2><ul className="flex flex-wrap gap-2">{workspace.members.map((member) => <li key={member.id} className="rounded-full bg-zinc-100 px-3 py-2 text-sm">{member.name} · {member.email}</li>)}</ul></section>
      <section className="space-y-4"><h2 className="text-xl font-semibold">마일스톤</h2><MilestoneForm teamId={workspace.id} />{workspace.milestones.length === 0 ? <p className="text-zinc-600">등록된 마일스톤이 없습니다.</p> : <ul className="divide-y rounded-xl border">{workspace.milestones.map((milestone) => <li key={milestone.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{milestone.title}</p><p className="text-sm text-zinc-600">{koreanDate.format(milestone.dueAt)}</p></div><MilestoneStatusForm teamId={workspace.id} milestoneId={milestone.id} status={milestone.status} /></li>)}</ul>}</section>
      <section className="space-y-4"><h2 className="text-xl font-semibold">진행 기록</h2><ProgressUpdateForm teamId={workspace.id} />{workspace.progressUpdates.length === 0 ? <p className="text-zinc-600">진행 기록이 없습니다.</p> : <ul className="grid gap-4">{workspace.progressUpdates.map((update) => <li key={update.id} className="rounded-xl border p-5"><div className="flex justify-between gap-3 text-sm text-zinc-600"><span>{update.authorName}</span><time>{koreanDate.format(update.createdAt)}</time></div><p className="mt-3 whitespace-pre-wrap">{update.content}</p>{update.risk ? <p className="mt-3 text-red-700">위험: {update.risk}</p> : null}{update.nextAction ? <p className="mt-2 text-blue-800">다음 행동: {update.nextAction}</p> : null}</li>)}</ul>}</section>
    </main>
  );
}
