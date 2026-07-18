import type { ReactNode } from "react";

import { confirmTeamAction } from "@/app/teams/[teamId]/actions";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/team-workspace-data";
import { TeamWorkspaceNavigation } from "@/app/teams/[teamId]/team-workspace-navigation";
import { CloseTeamForm } from "@/app/teams/[teamId]/workspace-forms";
import { AppShell } from "@/shared/ui/app-shell";
import { ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";

const workspaceStatus = {
  FORMING: "구성 중",
  CONFIRMED: "운영 중",
  CLOSED: "종료",
} as const;

export default async function TeamWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const progress = workspace.milestoneCount === 0 ? 0 : Math.round((workspace.completedMilestoneCount / workspace.milestoneCount) * 100);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <main className="mx-auto grid w-full max-w-[1280px] gap-0 px-5 pb-28 pt-6 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-10 lg:pb-16 lg:pt-0">
        <aside aria-label="프로젝트 정보와 메뉴" className="border-b border-[var(--line)] pb-5 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:pb-10 lg:pr-6 lg:pt-10">
          <div className="lg:sticky lg:top-24">
            <div className="border-b border-[var(--line)] pb-5">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-lg font-black text-white">P</span>
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold tracking-[-0.02em]">{workspace.name}</p>
                  <p className="muted mt-1 line-clamp-2 text-xs leading-5">{workspace.topicTitle}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <StatusBadge tone={workspace.status === "CONFIRMED" ? "info" : "neutral"}>{workspaceStatus[workspace.status]}</StatusBadge>
                <span className="muted text-xs">팀원 {workspace.members.length}명</span>
              </div>
              <div className="mt-5"><ProgressBar value={progress} label="마일스톤 진행" /></div>
            </div>
            <div className="mt-4"><TeamWorkspaceNavigation teamId={workspace.id} /></div>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {workspace.status === "FORMING" && actor.role !== "STUDENT" ? (
                <form action={confirmTeamAction}>
                  <input type="hidden" name="teamId" value={workspace.id} />
                  <button className="button-primary">팀 확정</button>
                </form>
              ) : null}
              {workspace.status === "CONFIRMED" && workspace.canClose && actor.role !== "STUDENT" ? <CloseTeamForm teamId={workspace.id} /> : null}
            </div>
            <div className="mt-6 hidden border-t border-[var(--line)] pt-5 lg:block">
              <p className="muted text-xs">지도교수</p>
              <p className="mt-1 text-sm font-semibold">{workspace.professorName}</p>
              {workspace.status === "FORMING" && actor.role !== "STUDENT" ? (
                <form action={confirmTeamAction} className="mt-4">
                  <input type="hidden" name="teamId" value={workspace.id} />
                  <button className="button-primary w-full">팀 확정</button>
                </form>
              ) : null}
              {workspace.status === "CONFIRMED" && workspace.canClose && actor.role !== "STUDENT" ? <div className="mt-4"><CloseTeamForm teamId={workspace.id} /></div> : null}
            </div>
          </div>
        </aside>
        <div className="portal-hero-copy min-w-0 pt-9 lg:px-10 lg:pt-10 xl:px-14">{children}</div>
      </main>
    </AppShell>
  );
}
