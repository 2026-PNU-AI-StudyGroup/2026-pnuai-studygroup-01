import type { Metadata } from "next";

import {
  TaskCompletionForm,
  TaskCreateDialog,
  TaskEditDialog,
} from "@/app/projects/[projectId]/_components/task-forms";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import {
  taskDeadlineState,
  presentTasks,
  type TaskPageItem,
} from "@/modules/team/ui/task-presentation";
import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { CheckIcon } from "@/shared/ui/workspace-icons";

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
  const displayedDate = task.completedAt ?? task.dueAt;

  return (
    <article
      aria-labelledby={titleId}
      className="h-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]"
    >
      <div className="p-5 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={taskStatus[task.status][1]}><UiText>{taskStatus[task.status][0]}</UiText></StatusBadge>
              {/* 기한 초과는 옆의 빨간 배지 하나로만 알린다. 날짜 표시는 늘 회색이다. */}
              <span className="inline-flex min-h-[1.375rem] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--muted)]">
                <UiText>{task.status === "DONE" ? "완료일" : "완료 예정"}</UiText>
                <time dateTime={displayedDate.toISOString()}><UiDate value={displayedDate} mode="date" /></time>
              </span>
              {deadlineState === "OVERDUE" ? <StatusBadge tone="danger"><UiText>{"기한 초과"}</UiText></StatusBadge> : null}
            </div>
            <h3 id={titleId} className="mt-3 break-words text-base font-semibold leading-6 text-[var(--ink)]">
              <UiText>{task.title}</UiText>
            </h3>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canEdit ? (
              <>
                <TaskCompletionForm teamId={teamId} taskId={task.id} title={task.title} status={task.status} />
                <TaskEditDialog
                  teamId={teamId}
                  taskId={task.id}
                  title={task.title}
                  dueAt={task.dueAt}
                  status={task.status}
                  assigneeIds={task.assignees.map(({ id }) => id)}
                  members={members}
                />
              </>
            ) : null}
          </div>
        </header>

        <dl className="mt-5 text-sm">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[var(--muted)]"><UiText>{"담당자"}</UiText></dt>
            <dd className="mt-1 break-words font-medium text-[var(--ink)]">
              <UiText>{task.assignees.map(({ name }) => name).join(", ") || "미지정"}</UiText>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export default async function TeamTasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { workspace } = await loadActiveTeamWorkspace(projectId);
  const canEditTasks = workspace.status !== "COMPLETED" && workspace.access.canContribute;
  const emptyDescription = workspace.status === "COMPLETED" ? "프로젝트 종료 전에 만든 할 일이 없습니다." : !workspace.access.canContribute ? "팀원이 첫 할 일을 만들면 작업 상태를 확인할 수 있습니다." : "첫 할 일과 완료 예정일, 담당자를 정해 주세요.";
  const now = new Date();
  const { active, completed } = presentTasks(workspace.tasks, now);

  return (
    <section aria-labelledby="tasks-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title="할 일"
        titleId="tasks-title"
        bordered={false}
        meta={(
          <div className="flex flex-wrap gap-2 text-sm font-medium tabular-nums">
            <span className="rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-[var(--accent-ink)]">
              <UiText>{"남은 할 일"}</UiText>{" "}{active.length}
            </span>
            <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1 text-[var(--success)]">
              <UiText>{"완료"}</UiText>{" "}{completed.length}/{workspace.taskCount}
            </span>
          </div>
        )}
        actions={canEditTasks ? <TaskCreateDialog teamId={workspace.id} members={workspace.members} /> : undefined}
      />

      {workspace.tasks.length === 0 ? <EmptyState title="할 일이 없습니다" description={emptyDescription} /> : (
        <div className="space-y-6">
          {active.length > 0 ? (
            <section aria-labelledby="active-tasks-title">
              <div className="flex items-center justify-between gap-4">
                <h2 id="active-tasks-title" className="text-lg font-semibold"><UiText>{"남은 할 일"}</UiText></h2>
                <span className="text-sm tabular-nums text-[var(--muted)]">{active.length}<UiText>{"건"}</UiText></span>
              </div>
              <ol className="mt-4 grid gap-4 lg:grid-cols-2">
                {active.map((task) => (
                  <li key={task.id} className="min-w-0">
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
            <div className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <CheckIcon className="size-5 shrink-0 text-[var(--success)]" />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[var(--ink)]"><UiText>{"모든 할 일 완료"}</UiText></h2>
                  <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"등록된 할 일을 모두 마쳤습니다."}</UiText></p>
                </div>
              </div>
              <span className="w-fit shrink-0 rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-sm font-medium tabular-nums text-[var(--muted)]">
                {completed.length}/{workspace.taskCount} <UiText>{"완료"}</UiText>
              </span>
            </div>
          )}

          {completed.length > 0 ? (
            <details className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] px-5 py-4 font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                <span><UiText>{"완료한 일"}</UiText>{" "}{completed.length}<UiText>{"건"}</UiText></span>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform group-open:rotate-180 [stroke-linecap:round] [stroke-linejoin:round]"><path d="m6 8 4 4 4-4" /></svg>
              </summary>
              <ol className="mt-4 grid gap-4 lg:grid-cols-2">
                {completed.map((task) => (
                  <li key={task.id} className="min-w-0">
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
