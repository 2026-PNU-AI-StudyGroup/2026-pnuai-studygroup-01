import { UiLink } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { ReactNode } from "react";

import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { TeamWorkspaceNavigation } from "@/app/projects/[projectId]/_components/team-workspace-navigation";
import { AppShell } from "@/app/_components/app-shell";

export default async function TeamWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadActiveTeamWorkspace(projectId);

  // 프로젝트 메뉴. 넓은 화면에서는 왼쪽 메뉴 아래, 휴대폰에서는 본문 위에 놓인다.
  // 상태, 보고서 제출, 구성원, 정보 수정은 개요 머리와 옆 칸으로 옮겼다. 여기는 어느 프로젝트인지와 메뉴만 둔다.
  const panel = (
    <div className="px-5 py-4 sm:px-8 lg:p-0">
      <UiLink
        href="/dashboard"
        aria-label="프로젝트 목록으로 돌아가기"
        className="mb-2 inline-flex min-h-8 items-center gap-1.5 text-[0.8125rem] text-[var(--muted)] transition-colors hover:text-[var(--ink)] lg:px-2.5"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.5]">
          <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <UiText>{"프로젝트 목록"}</UiText>
      </UiLink>
      <div className="lg:border-b lg:border-[var(--line)] lg:px-2.5 lg:pb-4">
        <p className="truncate text-xs text-[var(--muted)]"><UiText>{workspace.programName}</UiText></p>
        <p className="mt-1 text-sm font-semibold leading-snug [overflow-wrap:anywhere]"><UiText>{workspace.topicTitle}</UiText></p>
      </div>
      <div className="mt-3"><TeamWorkspaceNavigation projectId={workspace.topicId} advisorEnabled={workspace.advisorEnabled} canDelete={actor.role === "ADMIN"} /></div>
    </div>
  );

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard" crumbs={[{ label: workspace.topicTitle }]} panel={panel}>
      <main className="min-w-0 px-5 pb-28 pt-5 sm:px-8 sm:pt-8 lg:px-10 lg:py-8 xl:px-12">
        <div className="mx-auto w-full max-w-6xl"><UiText>{children}</UiText></div>
      </main>
    </AppShell>
  );
}
