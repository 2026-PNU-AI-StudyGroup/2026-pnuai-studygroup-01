import type { ReactNode } from "react";

import { confirmTeamAction } from "@/app/teams/[teamId]/actions";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/team-workspace-data";
import { TeamWorkspaceNavigation } from "@/app/teams/[teamId]/team-workspace-navigation";
import { CloseTeamForm } from "@/app/teams/[teamId]/workspace-forms";
import { AppShell } from "@/shared/ui/app-shell";
import { PageHeader, ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";

export default async function TeamWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const progress = workspace.milestoneCount === 0 ? 0 : Math.round((workspace.completedMilestoneCount / workspace.milestoneCount) * 100);

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
    <main className="content-shell space-y-8">
      <PageHeader eyebrow="프로젝트 공간" title={workspace.name} description={`${workspace.topicTitle} · 지도교수 ${workspace.professorName}`} actions={<div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center"><StatusBadge>{workspace.status === "FORMING" ? "구성 중" : workspace.status === "CONFIRMED" ? "확정 팀" : "종료 팀"}</StatusBadge>{workspace.status === "FORMING" && actor.role !== "STUDENT" ? <form action={confirmTeamAction}><input type="hidden" name="teamId" value={workspace.id} /><button className="button-primary">팀 확정</button></form> : null}{workspace.status === "CONFIRMED" && workspace.canClose && actor.role !== "STUDENT" ? <CloseTeamForm teamId={workspace.id} /> : null}<div className="w-full sm:w-48"><ProgressBar value={progress} /></div></div>} />
      <TeamWorkspaceNavigation teamId={workspace.id} />
      {children}
    </main>
  </AppShell>;
}
