import type { ReactNode } from "react";

import { cardClass, CardHead, ObjectHeader, Pill } from "@/modules/project-program/ui/work-screen";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { schedulePhaseState } from "@/modules/team/ui/task-presentation";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { ProgramIcon } from "@/shared/ui/program-icon";

type DateValue = Date | string;

export type PortalProgram = {
  id?: string;
  name: string;
  category: string;
  icon?: ProgramIconKey;
  isPublic?: boolean;
  startsAt?: DateValue;
  endsAt?: DateValue;
  projectRegistrationStartsAt?: DateValue;
  projectRegistrationEndsAt?: DateValue;
  recruitmentStartsAt?: DateValue | null;
  recruitmentEndsAt?: DateValue | null;
  executionStartsAt?: DateValue;
  executionEndsAt?: DateValue;
  votingPolicy?: { startsAt: DateValue; endsAt: DateValue } | null;
};

/**
 * 사업 화면의 머리. 사업 이름, 분류와 기간, 데이터에서 뽑은 한 줄, 할 일 버튼을 한 카드에 둔다.
 * 표지 자리에는 이름의 회차(7회, 2기)를, 없으면 사업 아이콘을 얹는다.
 */
export function ProjectPortalHero({ view, program, titleAction, actions, finding }: {
  view: "active" | "past";
  program?: PortalProgram;
  titleAction?: ReactNode;
  actions?: ReactNode;
  finding?: ReactNode;
}) {
  const title = program?.name ?? (view === "past" ? "지난 프로젝트" : "전체 프로젝트");
  const edition = program?.name.match(/(\d+)\s*(기|회|차)/);
  return (
    <ObjectHeader
      id="explorer-hero-title"
      media={program ? (
        <div aria-hidden="true" className="flex h-[3.875rem] w-[3.125rem] flex-none flex-col justify-end rounded bg-[var(--primary)] p-1.5 text-white">
          {edition ? (
            <>
              <b className="text-xl font-bold leading-5 tabular-nums">{edition[1]}</b>
              <small className="text-[0.6875rem] leading-[0.8125rem] opacity-90">{edition[2]}</small>
            </>
          ) : program.icon ? <ProgramIcon icon={program.icon} className="mb-0.5 size-6" /> : null}
        </div>
      ) : undefined}
      title={<UiText>{title}</UiText>}
      titleAside={titleAction}
      meta={program ? (
        <>
          <UiText>{program.category}</UiText>
          {program.startsAt && program.endsAt ? <>, <span className="tabular-nums"><UiDate value={program.startsAt} /> ~ <UiDate value={program.endsAt} /></span></> : null}
          {program.isPublic === false ? <>, <UiText>{"비공개 사업"}</UiText></> : null}
        </>
      ) : <UiText>{view === "past" ? "완료된 프로젝트와 결과물" : "지금 참여할 수 있는 프로젝트"}</UiText>}
      finding={finding}
      actions={actions}
    />
  );
}

/** 사업 일정. 지금 걸린 기간에 표시를 달고, 지난 기간은 회색으로 둔다. */
export function ProgramScheduleCard({ program, now }: { program: PortalProgram; now: Date }) {
  const periods: Array<[string, DateValue | null | undefined, DateValue | null | undefined]> = [
    ["운영", program.startsAt, program.endsAt],
    ["프로젝트 등록", program.projectRegistrationStartsAt ?? program.startsAt, program.projectRegistrationEndsAt ?? program.endsAt],
    ["모집", program.recruitmentStartsAt, program.recruitmentEndsAt],
    ["수행", program.executionStartsAt, program.executionEndsAt],
    ["투표", program.votingPolicy?.startsAt, program.votingPolicy?.endsAt],
  ];
  const rows = periods.filter((row): row is [string, DateValue, DateValue] => Boolean(row[1] && row[2]));
  if (!rows.length) return null;
  const states = rows.map(([, start, end]) => schedulePhaseState(new Date(start), new Date(end), now));
  const allDone = states.every((state) => state === "COMPLETE");
  // 기간은 겹친다(운영 안에 등록, 모집, 수행). "지금" 표시는 가장 좁은 기간 하나에만 단다.
  const currentIndex = states.lastIndexOf("CURRENT");
  return (
    <section aria-labelledby="program-schedule-title" className={cardClass}>
      <CardHead id="program-schedule-title" title={<UiText>{"일정"}</UiText>} count={allDone ? <UiText>{"모두 끝남"}</UiText> : undefined} />
      <ol className="px-5 pb-3">
        {rows.map(([label, start, end], index) => (
          <li key={label} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 text-[0.8125rem] [&+li]:border-t [&+li]:border-[var(--line)] ${states[index] === "COMPLETE" ? "text-[var(--muted)]" : "text-[var(--ink)]"}`}>
            <span className="flex min-w-0 items-center gap-2"><UiText>{label}</UiText>{index === currentIndex ? <Pill tone="accent">{"지금"}</Pill> : null}</span>
            <span className="text-right tabular-nums text-[var(--muted)]"><UiDate value={start} /> ~ <UiDate value={end} /></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
