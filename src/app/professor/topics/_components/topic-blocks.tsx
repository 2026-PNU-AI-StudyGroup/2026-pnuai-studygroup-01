import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import { cardClass, CardHead, daysLabel, daysUntil, Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import type { TopicSummary } from "@/modules/topic/application/topic-ports";
import { schedulePhaseState } from "@/modules/team/ui/task-presentation";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";

// 진행 중인 것만 파랑, 손볼 일(승인 대기, 반려)만 제 색, 끝난 것은 회색.
export const topicStatusPill: Record<TopicSummary["effectiveStatus"], [string, PillTone]> = {
  PENDING_APPROVAL: ["승인 대기", "warning"],
  REJECTED: ["반려됨", "danger"],
  FORMING: ["진행", "accent"],
  IN_PROGRESS: ["진행", "accent"],
  COMPLETED: ["완료", "plain"],
  CANCELED: ["취소", "plain"],
};

export function TopicStatusPill({ status }: { status: TopicSummary["effectiveStatus"] }) {
  const [label, tone] = topicStatusPill[status];
  return <Pill tone={tone}>{label}</Pill>;
}

/** 검토 대기 지원만 걸러 이 프로젝트 이름으로 찾은 지원 검토 목록. 검색어는 100자까지만 받는다. */
export function pendingApplicationsHref(title: string) {
  return `/professor/applications?${new URLSearchParams({ q: title.slice(0, 100), status: "PENDING" })}`;
}

/** 새 프로젝트를 올릴 수 있는 프로그램과 등록 마감. 새 프로젝트 등록 버튼 옆에서 "어디에, 언제까지" 에 답한다. */
export function RegistrablePrograms({ programs, now }: { programs: ProjectProgramRecord[]; now: Date }) {
  return (
    <section aria-labelledby="registrable-programs-title" className={cardClass}>
      <CardHead id="registrable-programs-title" title={<UiText>{"등록 기간인 프로그램"}</UiText>} count={<>{programs.length}<UiText>{"개"}</UiText></>} />
      {programs.length ? (
        <ul className="px-5 pb-3">
          {programs.map((program) => {
            const end = program.projectRegistrationEndsAt ?? program.endsAt;
            const days = daysUntil(end, now);
            return (
              <li key={program.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 text-[0.8125rem] [&+li]:border-t [&+li]:border-[var(--line)]">
                <span className="min-w-0">
                  <span className="block truncate text-[var(--ink)]"><UiText>{program.name}</UiText></span>
                  <span className="block truncate text-xs text-[var(--muted)]"><UiText>{program.category}</UiText></span>
                </span>
                <span className="text-right text-xs leading-4 tabular-nums">
                  <span className="block text-[var(--ink)]"><UiDate value={end} /></span>
                  <span className={`block ${days <= 7 ? "font-medium text-[var(--accent-ink)]" : "text-[var(--muted)]"}`}><UiText>{daysLabel(days)}</UiText></span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"프로젝트 등록 기간인 공개 프로그램이 생기면 새 프로젝트를 만들 수 있습니다."}</UiText></p>
      )}
    </section>
  );
}

/** 프로젝트가 속한 프로그램 일정. 지금 걸린 기간 하나에 표시를 달고, 지난 기간은 회색으로 둔다. */
export function TopicSchedule({ topic, now }: { topic: TopicSummary; now: Date }) {
  const rows: Array<[string, Date, Date]> = [
    ...(topic.programRecruitmentStartsAt && topic.programRecruitmentEndsAt ? [["모집", topic.programRecruitmentStartsAt, topic.programRecruitmentEndsAt] as [string, Date, Date]] : []),
    ["수행", topic.programExecutionStartsAt, topic.programExecutionEndsAt],
    ...(topic.programVotingStartsAt && topic.programVotingEndsAt ? [["투표", topic.programVotingStartsAt, topic.programVotingEndsAt] as [string, Date, Date]] : []),
  ];
  const states = rows.map(([, start, end]) => schedulePhaseState(start, end, now));
  const currentIndex = states.lastIndexOf("CURRENT");
  return (
    <section aria-labelledby="topic-schedule-title" className={cardClass}>
      <CardHead id="topic-schedule-title" title={<UiText>{"프로그램 일정"}</UiText>} />
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
