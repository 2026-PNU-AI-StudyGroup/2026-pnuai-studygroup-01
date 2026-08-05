import type { Metadata } from "next";

import { MilestoneForm, MilestoneStatusForm } from "@/app/teams/[teamId]/_components/milestone-forms";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import {
  milestoneDeadlineState,
  presentMilestones,
  type MilestonePageItem,
} from "@/app/teams/[teamId]/_lib/milestone-page-presentation";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 마일스톤");
}

const milestoneStatus = {
  TODO: ["할 일", "info"],
  IN_PROGRESS: ["진행 중", "warning"],
  DONE: ["완료", "success"],
} as const;

function MilestoneCard({
  milestone,
  teamId,
  members,
  canEdit,
  now,
}: {
  milestone: MilestonePageItem;
  teamId: string;
  members: TeamWorkspace["members"];
  canEdit: boolean;
  now: Date;
}) {
  const deadlineState = milestoneDeadlineState(milestone, now);
  const titleId = `milestone-title-${milestone.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className={`overflow-hidden rounded-[var(--radius-panel)] border bg-white shadow-[0_10px_30px_rgba(31,35,48,0.055)] ${
        deadlineState === "OVERDUE"
          ? "border-[color-mix(in_srgb,var(--danger)_35%,var(--line))]"
          : deadlineState === "COMPLETE"
            ? "border-[color-mix(in_srgb,var(--success)_22%,var(--line))]"
            : "border-[var(--line)]"
      }`}
    >
      <div className="p-5 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={milestoneStatus[milestone.status][1]}><UiText>{milestoneStatus[milestone.status][0]}</UiText></StatusBadge>
              {deadlineState === "OVERDUE" ? <StatusBadge tone="danger"><UiText>{"기한 초과"}</UiText></StatusBadge> : null}
            </div>
            <h3 id={titleId} className="mt-3 break-words text-lg font-black leading-7 tracking-[-0.025em] text-[var(--ink)]">
              <UiText>{milestone.title}</UiText>
            </h3>
          </div>
          <div className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${
            deadlineState === "OVERDUE"
              ? "bg-[var(--danger-subtle)] text-[var(--danger)]"
              : deadlineState === "COMPLETE"
                ? "bg-[var(--success-subtle)] text-[var(--success)]"
                : "bg-[var(--primary-subtle)] text-[var(--primary-hover)]"
          }`}>
            <span className="mr-2 text-xs"><UiText>{"완료 예정"}</UiText></span>
            <time dateTime={milestone.dueAt.toISOString()}><UiDate value={milestone.dueAt} mode="date" /></time>
          </div>
        </header>

        <dl className="mt-5 text-sm">
          <div className="min-w-0">
            <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText></dt>
            <dd className="mt-1.5 break-words font-bold text-[var(--ink)]">
              <UiText>{milestone.assignees.map(({ name }) => name).join(", ") || "미지정"}</UiText>
            </dd>
          </div>
        </dl>

        {canEdit ? (
          <div className="mt-5 rounded-2xl bg-[var(--surface-subtle)] p-4">
            <MilestoneStatusForm
              teamId={teamId}
              milestoneId={milestone.id}
              status={milestone.status}
              assigneeIds={milestone.assignees.map(({ id }) => id)}
              members={members}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function TeamMilestonesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { workspace } = await loadTeamWorkspace(teamId);
  const canEditMilestones = workspace.status !== "CLOSED" && workspace.access.canContribute;
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 만든 마일스톤이 없습니다." : !workspace.access.canContribute ? "팀원이 첫 마일스톤을 만들면 작업 상태를 확인할 수 있습니다." : "첫 목표와 완료 예정일, 담당자를 정해 주세요.";
  const now = new Date();
  const { active, completed } = presentMilestones(workspace.milestones, now);

  return (
    <section aria-labelledby="milestones-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        eyebrow="계획"
        title="마일스톤"
        titleId="milestones-title"
        description="목표별 담당자와 완료 예정일, 현재 상태를 관리합니다."
        bordered={false}
        meta={(
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-full bg-[var(--primary-subtle)] px-3 py-1.5 text-[var(--primary-hover)]">
              <UiText>{"활성"}</UiText>{" "}{active.length}
            </span>
            <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1.5 text-[var(--success)]">
              <UiText>{"완료"}</UiText>{" "}{completed.length}/{workspace.milestoneCount}
            </span>
          </div>
        )}
      />

      {canEditMilestones ? <MilestoneForm teamId={workspace.id} members={workspace.members} /> : null}

      {workspace.milestones.length === 0 ? <EmptyState title="마일스톤이 없습니다" description={emptyDescription} /> : (
        <div className="space-y-6">
          {active.length > 0 ? (
            <section aria-labelledby="active-milestones-title">
              <div className="flex items-center justify-between gap-4">
                <h2 id="active-milestones-title" className="text-xl font-black tracking-[-0.035em]"><UiText>{"활성"}</UiText>{" "}<UiText>{"마일스톤"}</UiText></h2>
                <span className="text-sm font-bold text-[var(--muted)]">{active.length}<UiText>{"건"}</UiText></span>
              </div>
              <ol className="mt-4 grid gap-4">
                {active.map((milestone) => (
                  <li key={milestone.id}>
                    <MilestoneCard
                      milestone={milestone}
                      teamId={workspace.id}
                      members={workspace.members}
                      canEdit={canEditMilestones}
                      now={now}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <div className="rounded-[var(--radius-panel)] border border-[color-mix(in_srgb,var(--success)_24%,var(--line))] bg-[linear-gradient(135deg,var(--success-subtle),#fff_76%)] px-5 py-6 sm:px-6">
              <h2 className="text-lg font-black text-[var(--ink)]"><UiText>{"모든 마일스톤 완료"}</UiText></h2>
            </div>
          )}

          {completed.length > 0 ? (
            <details className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-5 py-4 font-black text-[var(--ink)] shadow-[0_8px_24px_rgba(31,35,48,0.045)] [&::-webkit-details-marker]:hidden">
                <span><UiText>{"완료"}</UiText>{" "}<UiText>{"마일스톤"}</UiText>{" "}{completed.length}<UiText>{"건"}</UiText></span>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform group-open:rotate-180 [stroke-linecap:round] [stroke-linejoin:round]"><path d="m6 8 4 4 4-4" /></svg>
              </summary>
              <ol className="mt-4 grid gap-4">
                {completed.map((milestone) => (
                  <li key={milestone.id}>
                    <MilestoneCard
                      milestone={milestone}
                      teamId={workspace.id}
                      members={workspace.members}
                      canEdit={canEditMilestones}
                      now={now}
                    />
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}
