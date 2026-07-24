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
      <main className="mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-0 px-5 pb-28 pt-6 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-10 lg:pb-16 lg:pt-0">
        <aside aria-label="프로젝트 정보와 메뉴" className="min-w-0 rounded-[var(--radius-panel)] border border-white bg-white/84 p-5 shadow-[0_18px_48px_rgba(23,32,51,.1)] backdrop-blur lg:mt-8 lg:self-start lg:sticky lg:top-24">
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
                  <ConfirmSubmitButton className="button-primary" confirmMessage="팀을 확정하면 구성원을 기준으로 프로젝트 운영을 시작합니다. 확정하시겠습니까?">팀 확정</ConfirmSubmitButton>
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
                  <ConfirmSubmitButton className="button-primary w-full" confirmMessage="팀을 확정하면 구성원을 기준으로 프로젝트 운영을 시작합니다. 확정하시겠습니까?">팀 확정</ConfirmSubmitButton>
                </form>
              ) : null}
              {workspace.status === "CONFIRMED" && workspace.canClose && actor.role !== "STUDENT" ? <div className="mt-4"><CloseTeamForm teamId={workspace.id} /></div> : null}
            </div>
          </div>
        </aside>
        <div className="portal-hero-copy my-8 min-w-0 rounded-[var(--radius-panel)] border border-white bg-white/76 p-5 shadow-[0_20px_55px_rgba(23,32,51,.08)] backdrop-blur sm:p-8 lg:ml-8 lg:p-10 xl:ml-10">{children}</div>
      </main>
    </AppShell>
  );
}
