import type { ReactNode } from "react";

import { confirmTeamAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { TeamWorkspaceNavigation } from "@/app/teams/[teamId]/_components/team-workspace-navigation";
import { CloseTeamForm } from "@/app/teams/[teamId]/_components/close-team-form";
import { AppShell } from "@/app/_components/app-shell";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
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
      <main className="grid w-full grid-cols-[minmax(0,1fr)] pb-28 lg:min-h-screen lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:pb-0">
        <aside aria-label="프로젝트 정보와 메뉴" className="min-w-0 bg-white px-5 pb-5 pt-5 sm:px-8 lg:border-r lg:border-[var(--line)] lg:px-5 lg:py-8">
          <div className="lg:sticky lg:top-8">
            <div className="lg:border-b lg:border-[var(--line)] lg:pb-6">
              <div className="flex min-w-0 items-start justify-between gap-4 lg:block">
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold tracking-[-0.025em]">{workspace.name}</p>
                  <p className="muted mt-1 line-clamp-1 text-xs leading-5 lg:line-clamp-2">{workspace.topicTitle}</p>
                </div>
                <StatusBadge tone={workspace.status === "CONFIRMED" ? "info" : "neutral"}>{workspaceStatus[workspace.status]}</StatusBadge>
              </div>
              <div className="mt-4 hidden lg:block">
                <ProgressBar value={progress} label={`마일스톤 ${workspace.completedMilestoneCount}/${workspace.milestoneCount}`} />
              </div>
            </div>
            <div className="mt-4 lg:mt-5"><TeamWorkspaceNavigation teamId={workspace.id} /></div>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {workspace.status === "FORMING" && actor.role !== "STUDENT" ? (
                <form action={confirmTeamAction}>
                  <input type="hidden" name="teamId" value={workspace.id} />
                  <ConfirmSubmitButton className="button-primary" confirmMessage="팀을 확정하면 구성원을 기준으로 프로젝트 운영을 시작합니다. 확정하시겠습니까?">팀 확정</ConfirmSubmitButton>
                </form>
              ) : null}
              {workspace.status === "CONFIRMED" && workspace.canClose && actor.role !== "STUDENT" ? <CloseTeamForm teamId={workspace.id} /> : null}
            </div>
            <div className="mt-7 hidden border-t border-[var(--line)] pt-5 lg:block">
              <p className="muted text-[0.6875rem] font-bold uppercase tracking-[0.08em]">지도교수</p>
              <p className="mt-1.5 text-sm font-semibold">{workspace.professorName}</p>
              <p className="muted mt-1 text-xs">팀원 {workspace.members.length}명</p>
              {workspace.status === "FORMING" && actor.role !== "STUDENT" ? (
                <form action={confirmTeamAction} className="mt-4">
                  <input type="hidden" name="teamId" value={workspace.id} />
                  <ConfirmSubmitButton className="button-primary w-full" confirmMessage="팀을 확정하면 구성원을 기준으로 프로젝트 운영을 시작합니다. 확정하시겠습니까?">팀 확정</ConfirmSubmitButton>
                </form>
              ) : null}
              {workspace.status === "CONFIRMED" && workspace.canClose && actor.role !== "STUDENT" ? <div className="mt-4"><CloseTeamForm teamId={workspace.id} /></div> : null}
            </div>
          </div>
        </aside>
        <div className="min-w-0 px-5 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:py-10 xl:px-12">{children}</div>
      </main>
    </AppShell>
  );
}
