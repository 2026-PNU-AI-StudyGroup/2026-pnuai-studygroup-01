import type { Metadata } from "next";

import {
  TaskDeleteForm,
  TaskDetailsForm,
  TaskForm,
  TaskStatusForm,
} from "@/app/teams/[teamId]/_components/task-forms";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import {
  taskDeadlineState,
  presentTasks,
  type TaskPageItem,
} from "@/app/teams/[teamId]/_lib/task-page-presentation";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 할 일");
}

const taskStatus = {
  TODO: ["할 일", "info"],
  IN_PROGRESS: ["진행 중", "warning"],
  DONE: ["완료", "success"],
} as const;

function TaskCard({
  task,
  teamId,
  members,
  canEdit,
  now,
}: {
  task: TaskPageItem;
  teamId: string;
  members: TeamWorkspace["members"];
  canEdit: boolean;
  now: Date;
}) {
  const deadlineState = taskDeadlineState(task, now);
  const titleId = `task-title-${task.id}`;

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
              <StatusBadge tone={taskStatus[task.status][1]}><UiText>{taskStatus[task.status][0]}</UiText></StatusBadge>
              {deadlineState === "OVERDUE" ? <StatusBadge tone="danger"><UiText>{"기한 초과"}</UiText></StatusBadge> : null}
            </div>
            <h3 id={titleId} className="mt-3 break-words text-lg font-black leading-7 tracking-[-0.025em] text-[var(--ink)]">
              <UiText>{task.title}</UiText>
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
            <time dateTime={task.dueAt.toISOString()}><UiDate value={task.dueAt} mode="date" /></time>
          </div>
        </header>

        <dl className="mt-5 text-sm">
          <div className="min-w-0">
            <dt className="text-xs font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText></dt>
            <dd className="mt-1.5 break-words font-bold text-[var(--ink)]">
              <UiText>{task.assignees.map(({ name }) => name).join(", ") || "미지정"}</UiText>
            </dd>
          </div>
        </dl>

        {canEdit ? (
          <div className="mt-5 grid gap-4 rounded-2xl bg-[var(--surface-subtle)] p-4">
            <TaskDetailsForm
              teamId={teamId}
              taskId={task.id}
              title={task.title}
              dueAt={task.dueAt}
            />
            <TaskStatusForm
              teamId={teamId}
              taskId={task.id}
              status={task.status}
              assigneeIds={task.assignees.map(({ id }) => id)}
              members={members}
            />
            <TaskDeleteForm teamId={teamId} taskId={task.id} title={task.title} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function TeamTasksPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { workspace } = await loadTeamWorkspace(teamId);
  const canEditTasks = workspace.status !== "CLOSED" && workspace.access.canContribute;
  const emptyDescription = workspace.status === "CLOSED" ? "프로젝트 종료 전에 만든 할 일이 없습니다." : !workspace.access.canContribute ? "팀원이 첫 할 일을 만들면 작업 상태를 확인할 수 있습니다." : "첫 할 일과 완료 예정일, 담당자를 정해 주세요.";
  const now = new Date();
  const { active, completed } = presentTasks(workspace.tasks, now);

  return (
    <section aria-labelledby="tasks-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title="할 일"
        titleId="tasks-title"
        bordered={false}
        meta={(
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-full bg-[var(--primary-subtle)] px-3 py-1.5 text-[var(--primary-hover)]">
              <UiText>{"남은 할 일"}</UiText>{" "}{active.length}
            </span>
            <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1.5 text-[var(--success)]">
              <UiText>{"완료"}</UiText>{" "}{completed.length}/{workspace.taskCount}
            </span>
          </div>
        )}
      />

      {canEditTasks ? <TaskForm teamId={workspace.id} members={workspace.members} /> : null}

      {workspace.tasks.length === 0 ? <EmptyState title="할 일이 없습니다" description={emptyDescription} /> : (
        <div className="space-y-6">
          {active.length > 0 ? (
            <section aria-labelledby="active-tasks-title">
              <div className="flex items-center justify-between gap-4">
                <h2 id="active-tasks-title" className="text-xl font-black tracking-[-0.035em]"><UiText>{"남은 할 일"}</UiText></h2>
                <span className="text-sm font-bold text-[var(--muted)]">{active.length}<UiText>{"건"}</UiText></span>
              </div>
              <ol className="mt-4 grid gap-4">
                {active.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      teamId={workspace.id}
                      members={workspace.members}
                      canEdit={canEditTasks}
                      now={now}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <div className="rounded-[var(--radius-panel)] border border-[color-mix(in_srgb,var(--success)_24%,var(--line))] bg-[linear-gradient(135deg,var(--success-subtle),#fff_76%)] px-5 py-6 sm:px-6">
              <h2 className="text-lg font-black text-[var(--ink)]"><UiText>{"모든 할 일 완료"}</UiText></h2>
            </div>
          )}

          {completed.length > 0 ? (
            <details className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-5 py-4 font-black text-[var(--ink)] shadow-[0_8px_24px_rgba(31,35,48,0.045)] [&::-webkit-details-marker]:hidden">
                <span><UiText>{"완료"}</UiText>{" "}<UiText>{"할 일"}</UiText>{" "}{completed.length}<UiText>{"건"}</UiText></span>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform group-open:rotate-180 [stroke-linecap:round] [stroke-linejoin:round]"><path d="m6 8 4 4 4-4" /></svg>
              </summary>
              <ol className="mt-4 grid gap-4">
                {completed.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      teamId={workspace.id}
                      members={workspace.members}
                      canEdit={canEditTasks}
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
