import { UiAside, UiLink } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { TeamWorkspaceNavigation } from "@/app/projects/[projectId]/_components/team-workspace-navigation";
import { TeamRosterSummary } from "@/app/projects/[projectId]/_components/team-roster-summary";
import { ConfirmTeamForm } from "@/app/projects/[projectId]/_components/confirm-team-form";
import { TeamProjectInfoEditDialog } from "@/app/projects/[projectId]/_components/team-project-info-form";
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
  const canEditProjectInfo = workspace.access.canSupervise || workspace.access.isTeamLeader;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <main className="grid w-full grid-cols-[minmax(0,1fr)] pb-28 lg:min-h-screen lg:grid-cols-[var(--shell-panel)_minmax(0,1fr)] lg:pb-0">
        <UiAside aria-label="프로젝트 정보와 메뉴" className="shell-panel min-w-0 bg-[var(--surface)] lg:border-r lg:border-[var(--line)]">
          {/* 여백을 안쪽으로 옮겼다. 칸이 0 으로 줄 때 바깥에 있으면 여백부터 찌그러진다. */}
          <div className="w-full bg-[var(--surface)] px-5 pb-5 pt-5 sm:px-8 lg:min-h-screen lg:w-[var(--shell-panel-open)] lg:px-5 lg:py-8">
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
            {/*
              프로젝트가 누구인지는 여기 한 곳에만 적는다. 탭마다 머리말에 다시 적으면 모바일에서
              한 화면에 같은 이름이 두 번 보인다. 이름 순서는 다른 화면과 같게 프로젝트명이 먼저, 팀 이름이 다음이다.
            */}
            <div className="lg:border-b lg:border-[var(--line)] lg:pb-6">
              <p className="eyebrow truncate"><UiText>{workspace.programName}</UiText></p>
              <div className="mt-1.5 flex min-w-0 items-start justify-between gap-3">
                <p className="min-w-0 text-base font-bold leading-snug tracking-[-0.025em] [overflow-wrap:anywhere]"><UiText>{workspace.topicTitle}</UiText></p>
                {workspace.status === "IN_PROGRESS" && (canEditProjectInfo || workspace.access.isTeamMember) ? (
                  <TeamProjectInfoEditDialog
                    teamId={workspace.id}
                    programName={workspace.programName}
                    title={workspace.topicTitle}
                    description={workspace.topicDescription}
                    disabled={!canEditProjectInfo}
                  />
                ) : null}
              </div>
              {workspace.name !== workspace.topicTitle ? <p className="muted mt-1 truncate text-xs font-semibold"><UiText>{workspace.name}</UiText></p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
                {/* 작업 공간을 여는 사람은 프로젝트 상세로 가도 이리로 돌아온다. 방문자 눈에 어떻게 보이는지는 여기서 연다. */}
                <UiLink href={`/topics/${workspace.topicId}?view=public`} className="text-xs font-bold text-[var(--primary)] hover:underline"><UiText>{"방문자 화면 보기"}</UiText></UiLink>
              </div>
              <div className="mt-4 hidden lg:block">
                {reportScheduleAvailable ? (
                  <ProgressBar value={progress} label={`보고서 제출 ${workspace.submittedReportCount}/${workspace.reportCount}`} />
                ) : (
                  <p className="text-xs font-bold text-[var(--muted)]"><UiText>{"보고서 일정이 없습니다"}</UiText></p>
                )}
              </div>
            </div>
            <div className="mt-4 lg:mt-5"><TeamWorkspaceNavigation projectId={workspace.topicId} advisorEnabled={workspace.advisorEnabled} canDelete={actor.role === "ADMIN"} /></div>
            <TeamRosterSummary
              projectId={workspace.topicId}
              advisorEnabled={workspace.advisorEnabled}
              professor={workspace.professor}
              assistants={workspace.assistants}
              members={workspace.members}
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
          </div>
        </UiAside>
        <div className="min-w-0 px-5 pb-16 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:py-10 xl:px-12">
          <div className="mx-auto w-full max-w-6xl"><UiText>{children}</UiText></div>
        </div>
      </main>
    </AppShell>
  );
}
