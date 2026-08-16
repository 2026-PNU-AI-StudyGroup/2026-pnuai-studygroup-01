import { UiAside, UiLink } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { TeamWorkspaceNavigation } from "@/app/projects/[projectId]/_components/team-workspace-navigation";
import { TeamPeopleSidebar } from "@/app/projects/[projectId]/_components/team-people-sidebar";
import { ConfirmTeamForm } from "@/app/projects/[projectId]/_components/confirm-team-form";
import { AppShell } from "@/app/_components/app-shell";
import { calculateReportSubmissionRate, hasReportSchedule } from "@/modules/team/domain/project-progress";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { ProgressBar, StatusBadge } from "@/shared/ui/page-primitives";

export default async function TeamWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadActiveTeamWorkspace(projectId);
  const progress = calculateReportSubmissionRate(
    workspace.submittedReportCount,
    workspace.reportCount,
  );
  const reportScheduleAvailable = hasReportSchedule(workspace.reportCount);
  const status = teamStatusPresentation[workspace.status];

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <main className="grid w-full grid-cols-[minmax(0,1fr)] pb-28 lg:min-h-screen lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)] lg:pb-0">
        <UiAside aria-label="프로젝트 정보와 메뉴" className="min-w-0 bg-white px-5 pb-5 pt-5 sm:px-8 lg:border-r lg:border-[var(--line)] lg:px-5 lg:py-8">
          <div className="lg:sticky lg:top-8">
            <UiLink
              href="/dashboard"
              aria-label="프로젝트 목록으로 돌아가기"
              className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]">
                <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <UiText>{"프로젝트 목록"}</UiText>
            </UiLink>
            <div className="lg:border-b lg:border-[var(--line)] lg:pb-6">
              <div className="flex min-w-0 items-start justify-between gap-4 lg:block">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold tracking-[-0.025em]">{workspace.name}</p>
                  <p className="muted mt-1 line-clamp-1 text-xs leading-5 lg:line-clamp-2"><UiText>{workspace.topicTitle}</UiText></p>
                </div>
                <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
              </div>
              <div className="mt-4 hidden lg:block">
                {reportScheduleAvailable ? (
                  <ProgressBar value={progress} label={`보고서 제출 ${workspace.submittedReportCount}/${workspace.reportCount}`} />
                ) : (
                  <p className="text-xs font-bold text-[var(--muted)]"><UiText>{"보고서 일정이 없습니다"}</UiText></p>
                )}
              </div>
            </div>
            <div className="mt-4 lg:mt-5"><TeamWorkspaceNavigation projectId={workspace.topicId} advisorEnabled={workspace.advisorEnabled} /></div>
            <TeamPeopleSidebar
              advisorEnabled={workspace.advisorEnabled}
              professor={workspace.professor}
              assistants={workspace.assistants}
              members={workspace.members}
              projectId={workspace.topicId}
              projectTeamId={workspace.id}
              actorId={actor.id}
              membershipChangesEnabled={workspace.status === "IN_PROGRESS"}
              canManageMembers={workspace.access.canSupervise || workspace.access.isTeamLeader}
            />
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {workspace.status === "FORMING" && workspace.access.canSupervise ? (
                <ConfirmTeamForm teamId={workspace.id} />
              ) : null}
            </div>
            <div className="mt-4 hidden lg:block">
              {workspace.status === "FORMING" && workspace.access.canSupervise ? (
                <ConfirmTeamForm teamId={workspace.id} buttonClassName="button-primary w-full" />
              ) : null}
            </div>
          </div>
        </UiAside>
        <div className="min-w-0 px-5 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:py-10 xl:px-12">
          <div className="mx-auto w-full max-w-6xl"><UiText>{children}</UiText></div>
        </div>
      </main>
    </AppShell>
  );
}
