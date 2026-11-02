import type { Metadata } from "next";

import {
  TaskCompletionForm,
  TaskCreateDialog,
  TaskEditDialog,
} from "@/app/projects/[projectId]/_components/task-forms";
import { monthDay, WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import {
  taskDeadlineState,
  presentTasks,
  type TaskPageItem,
} from "@/modules/team/ui/task-presentation";
import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import type { TeamWorkspace } from "@/modules/team/application/team-workspace-ports";
import { cardClass, CardHead, daysLabel, daysUntil, Pill } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState } from "@/shared/ui/page-primitives";
import { PersonAvatar } from "@/shared/ui/person-avatar";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 할 일");
}

const taskStatus = {
  TODO: { label: "할 일", tone: "plain" },
  IN_PROGRESS: { label: "진행 중", tone: "accent" },
  DONE: { label: "완료", tone: "plain" },
} as const;

/*
  할 일 표. 목록 폭이 40rem 이상이면 할 일, 담당자, 날짜, 상태, 버튼 다섯 칸이 줄을 맞추고,
  좁으면 담당자와 날짜, 상태가 제목 밑 한 줄로 흐른다. 버튼은 오른쪽 칸에 남는다.
*/
const rowGrid = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 @min-[40rem]:grid-cols-[minmax(0,1fr)_10rem_7rem_4.5rem_8.5rem] @min-[40rem]:gap-x-5";

function TaskTableHead({ dateLabel }: { dateLabel: string }) {
  return (
    <div aria-hidden="true" className={`${rowGrid} hidden h-9 px-5 text-xs text-[var(--muted)] @min-[40rem]:grid`}>
      <span><UiText>{"할 일"}</UiText></span>
      <span><UiText>{"담당자"}</UiText></span>
      <span className="text-right"><UiText>{dateLabel}</UiText></span>
      <span><UiText>{"상태"}</UiText></span>
      <span />
    </div>
  );
}

function TaskRow({
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
  const overdue = taskDeadlineState(task, now) === "OVERDUE";
  const displayedDate = task.completedAt ?? task.dueAt;
  const assignees = task.assignees.map(({ name }) => name).join(", ");

  return (
    <li className={`${rowGrid} border-t border-[var(--line)] px-5 py-2.5 text-[0.8125rem] transition-colors hover:bg-[#fafbfc]`}>
      <h3 className="min-w-0 break-words text-sm font-medium leading-5 text-[var(--ink)]"><UiText>{task.title}</UiText></h3>
      <div className="col-start-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 @min-[40rem]:contents">
        <span className={`min-w-0 truncate ${assignees ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}><UiText>{assignees || "미지정"}</UiText></span>
        <span className="flex items-baseline gap-1.5 whitespace-nowrap tabular-nums @min-[40rem]:flex-col @min-[40rem]:items-end @min-[40rem]:gap-0 @min-[40rem]:leading-4">
          <time dateTime={displayedDate.toISOString()} className="text-[var(--ink)]"><UiDate value={displayedDate} mode="date" /></time>
          {task.status === "DONE" ? null : overdue
            ? <span className="text-xs font-medium text-[var(--danger)]"><UiText>{"기한 초과"}</UiText></span>
            : <span className="text-xs text-[var(--muted)]"><UiText>{daysLabel(daysUntil(task.dueAt, now))}</UiText></span>}
        </span>
        <span><Pill tone={taskStatus[task.status].tone}>{taskStatus[task.status].label}</Pill></span>
      </div>
      <div className="col-start-2 row-span-2 row-start-1 flex justify-end gap-1.5 @min-[40rem]:col-start-auto @min-[40rem]:row-span-1 @min-[40rem]:row-start-auto">
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
    </li>
  );
}

export default async function TeamTasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { workspace } = await loadActiveTeamWorkspace(projectId);
  const canEditTasks = workspace.status !== "COMPLETED" && workspace.access.canContribute;
  const emptyDescription = workspace.status === "COMPLETED" ? "프로젝트 종료 전에 만든 할 일이 없습니다." : !workspace.access.canContribute ? "팀원이 첫 할 일을 만들면 작업 상태를 확인할 수 있습니다." : "첫 할 일과 완료 예정일, 담당자를 정해 주세요.";
  const now = new Date();
  const { active, completed } = presentTasks(workspace.tasks, now);
  const overdueCount = active.filter((task) => taskDeadlineState(task, now) === "OVERDUE").length;
  const nextDue = active.find((task) => taskDeadlineState(task, now) === "UPCOMING");
  const rowProps = { teamId: workspace.id, members: workspace.members, canEdit: canEditTasks, now };

  // 담당별 남은 할 일. 팀원은 0 이라도 적고, 담당자가 없는 할 일은 미지정 한 줄로 모은다.
  // 기한 초과는 표에서 이미 빨갛게 알리므로 여기서는 회색으로 센다.
  const load = new Map(workspace.members.map((member) => [member.id, { id: member.id, name: member.name, profileImage: member.profileImage, open: 0, overdue: 0 }]));
  const unassigned = { open: 0, overdue: 0 };
  for (const task of active) {
    const late = taskDeadlineState(task, now) === "OVERDUE";
    // 팀을 떠난 사람에게 남은 할 일도 그 이름으로 센다.
    for (const assignee of task.assignees) {
      if (!load.has(assignee.id)) load.set(assignee.id, { ...assignee, profileImage: null, open: 0, overdue: 0 });
    }
    const buckets = task.assignees.length ? task.assignees.map((assignee) => load.get(assignee.id)!) : [unassigned];
    for (const bucket of buckets) {
      bucket.open += 1;
      if (late) bucket.overdue += 1;
    }
  }
  const showLoad = workspace.tasks.length > 0 && load.size > 0;

  // 제목 밑 한 줄: 넘긴 마감이 먼저, 그다음 가장 가까운 완료 예정.
  const finding = workspace.tasks.length === 0 ? null : active.length === 0
    ? <UiText>{`등록한 할 일 ${completed.length}개를 모두 마쳤습니다.`}</UiText>
    : (
      <>
        {overdueCount ? <b className="font-semibold"><UiText>{`완료 예정일을 넘긴 할 일이 ${overdueCount}개입니다.`}</UiText></b> : null}
        {overdueCount && nextDue ? " " : null}
        {nextDue ? <UiText>{`가장 가까운 완료 예정은 ${nextDue.title}, ${monthDay.format(nextDue.dueAt)}(${daysLabel(daysUntil(nextDue.dueAt, now))})입니다.`}</UiText> : null}
      </>
    );

  return (
    <section aria-labelledby="tasks-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        title="할 일"
        titleId="tasks-title"
        finding={finding}
        actions={canEditTasks ? <TaskCreateDialog teamId={workspace.id} members={workspace.members} /> : undefined}
      />

      <div className="@container">
        <div className={`grid items-start gap-3.5 ${showLoad ? "@min-[60rem]:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}>
          <div className="grid min-w-0 gap-3.5">
            <section aria-labelledby="active-tasks-title" className={cardClass}>
              <CardHead
                id="active-tasks-title"
                title={<UiText>{"남은 할 일"}</UiText>}
                count={<UiText>{`${active.length}개`}</UiText>}
                action={workspace.taskCount ? <span className="tabular-nums text-[var(--muted)]"><UiText>{`${completed.length} / ${workspace.taskCount}개 완료`}</UiText></span> : undefined}
              />
              {workspace.tasks.length === 0 ? (
                <div className="border-t border-[var(--line)] px-5"><EmptyState variant="section" title="할 일이 없습니다" description={emptyDescription} /></div>
              ) : active.length === 0 ? (
                <p className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"등록된 할 일을 모두 마쳤습니다."}</UiText></p>
              ) : (
                <>
                  <TaskTableHead dateLabel="완료 예정" />
                  <ol>{active.map((task) => <TaskRow key={task.id} task={task} {...rowProps} />)}</ol>
                </>
              )}
            </section>

            {completed.length > 0 ? (
              <details className={`${cardClass} group`}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-5 py-3 [&::-webkit-details-marker]:hidden">
                  <h2 className="text-base font-semibold text-[var(--ink)]"><UiText>{"완료한 일"}</UiText></h2>
                  <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]"><UiText>{`${completed.length}개`}</UiText></span>
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-auto size-4 shrink-0 fill-none stroke-[var(--muted)] stroke-[1.8] transition-transform group-open:rotate-180 [stroke-linecap:round] [stroke-linejoin:round]"><path d="m6 8 4 4 4-4" /></svg>
                </summary>
                <TaskTableHead dateLabel="완료일" />
                <ol>{completed.map((task) => <TaskRow key={task.id} task={task} {...rowProps} />)}</ol>
              </details>
            ) : null}
          </div>

          {showLoad ? (
            <section aria-labelledby="task-load-title" className={cardClass}>
              <CardHead id="task-load-title" title={<UiText>{"담당별 남은 할 일"}</UiText>} />
              <ul className="pb-1.5 text-[0.8125rem]">
                {[...load.values()].map((person) => (
                  <li key={person.id} className="flex min-h-11 items-center gap-2.5 border-t border-[var(--line)] px-5 py-1.5">
                    <PersonAvatar userId={person.id} updatedAt={person.profileImage?.updatedAt} className="size-7 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{person.name}</span>
                    <span className="text-right tabular-nums leading-4">
                      <span className={`block ${person.open ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{person.open}</span>
                      {person.overdue ? <span className="block text-xs text-[var(--muted)]"><UiText>{`기한 초과 ${person.overdue}`}</UiText></span> : null}
                    </span>
                  </li>
                ))}
                {unassigned.open ? (
                  <li className="flex min-h-11 items-center gap-2.5 border-t border-[var(--line)] px-5 py-1.5">
                    <span aria-hidden="true" className="size-7 shrink-0 rounded-full border border-dashed border-[var(--line-strong)]" />
                    <span className="min-w-0 flex-1 text-[var(--muted)]"><UiText>{"미지정"}</UiText></span>
                    <span className="text-right tabular-nums leading-4">
                      <span className="block text-[var(--ink)]">{unassigned.open}</span>
                      {unassigned.overdue ? <span className="block text-xs text-[var(--muted)]"><UiText>{`기한 초과 ${unassigned.overdue}`}</UiText></span> : null}
                    </span>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
