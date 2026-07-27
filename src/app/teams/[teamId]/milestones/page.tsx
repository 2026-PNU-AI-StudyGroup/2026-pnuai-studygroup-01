import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";

import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { MilestoneForm, MilestoneStatusForm } from "@/app/teams/[teamId]/_components/milestone-forms";
import { MobileFieldLabel, WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 마일스톤");
}
const milestoneStatus = { TODO: ["할 일", "neutral"], IN_PROGRESS: ["진행 중", "warning"], DONE: ["완료", "success"] } as const;

export default async function TeamMilestonesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 만든 마일스톤이 없습니다." : actor.role === "PROFESSOR" ? "팀원이 첫 마일스톤을 만들면 작업 상태를 확인할 수 있습니다." : "첫 목표와 완료 예정일, 담당자를 정해 주세요.";

  return (
    <section aria-labelledby="milestones-title" className="space-y-8">
      <WorkspacePageHeader
        eyebrow="계획"
        title="마일스톤"
        titleId="milestones-title"
        description="목표별 담당자와 완료 예정일, 현재 상태를 관리합니다."
        meta={<p className="text-sm"><strong className="text-[var(--primary)]">{workspace.completedMilestoneCount}</strong> / {workspace.milestoneCount} {" "}<UiText>{"완료"}</UiText></p>}
      />
      {workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneForm teamId={workspace.id} members={workspace.members} /> : null}
      {workspace.milestones.length === 0 ? <EmptyState title="마일스톤이 없습니다" description={emptyDescription} /> : (
        <div>
          <div className="hidden grid-cols-[7rem_minmax(0,1fr)_9rem_10rem_19rem] border-b border-[var(--line-strong)] px-2 pb-3 text-xs font-bold text-[var(--muted)] xl:grid">
            <span><UiText>{"상태"}</UiText></span><span><UiText>{"마일스톤"}</UiText></span><span><UiText>{"담당자"}</UiText></span><span><UiText>{"완료 예정"}</UiText></span><span className="text-right"><UiText>{"변경"}</UiText></span>
          </div>
          <ol className="border-b border-[var(--line)]">
            {workspace.milestones.map((milestone) => (
              <li key={milestone.id} className="relative grid gap-4 border-b border-[var(--line)] px-2 py-5 last:border-b-0 xl:grid-cols-[7rem_minmax(0,1fr)_9rem_10rem_19rem] xl:items-center">
                <span aria-hidden="true" className="absolute -left-px top-0 h-full w-px bg-[var(--line)] md:hidden" />
                <span aria-hidden="true" className={`absolute -left-1 top-7 size-2 rounded-full ${milestone.status === "DONE" ? "bg-[var(--success)]" : "bg-[var(--primary)]"} md:hidden`} />
                <div><MobileFieldLabel><UiText>{"상태"}</UiText></MobileFieldLabel><StatusBadge tone={milestoneStatus[milestone.status][1]}>{milestoneStatus[milestone.status][0]}</StatusBadge></div>
                <div><MobileFieldLabel><UiText>{"마일스톤"}</UiText></MobileFieldLabel><p className="font-semibold"><UiText>{milestone.title}</UiText></p></div>
                <div><MobileFieldLabel><UiText>{"담당자"}</UiText></MobileFieldLabel><p className="text-sm font-semibold"><UiText>{milestone.assignees.map(({ name }) => name).join(", ") || "미지정"}</UiText></p></div>
                <div><MobileFieldLabel><UiText>{"완료 예정"}</UiText></MobileFieldLabel><time className="text-sm font-semibold md:text-[var(--muted)]" dateTime={milestone.dueAt.toISOString()}><UiDate value={milestone.dueAt} mode="date" /></time></div>
                <div className="xl:justify-self-end">{workspace.status !== "CLOSED" && actor.role !== "PROFESSOR" ? <MilestoneStatusForm teamId={workspace.id} milestoneId={milestone.id} status={milestone.status} assigneeIds={milestone.assignees.map(({ id }) => id)} members={workspace.members} /> : null}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
