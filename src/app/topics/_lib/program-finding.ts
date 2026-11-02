import { daysUntil } from "@/modules/project-program/ui/work-screen";

type DateValue = Date | string;

export type ProgramFindingInput = {
  now: Date;
  program: {
    startsAt?: DateValue;
    endsAt?: DateValue;
    projectRegistrationStartsAt?: DateValue;
    projectRegistrationEndsAt?: DateValue;
    recruitmentStartsAt?: DateValue | null;
    recruitmentEndsAt?: DateValue | null;
    executionStartsAt?: DateValue;
    executionEndsAt?: DateValue;
    studentProjectCreationEnabled?: boolean;
    votingPolicy?: { startsAt: DateValue; endsAt: DateValue } | null;
  };
  /** 관리자 화면의 운영 집계. 문제가 있으면 기간 안내보다 먼저 말한다. */
  operations?: { total: number; unassigned: number; overdue: number; showTeam: boolean };
  pendingApprovals?: number;
  /** 학생에게 지금 지원할 수 있는 프로젝트 수. */
  recruitingCount?: number;
};

const monthDay = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });

/**
 * 사업 머리의 한 줄. alert 는 손봐야 할 일(굵게), phase 는 지금 걸린 기간이다.
 * 둘 다 화면에 있는 같은 값에서 만든다.
 */
export function programFinding({ now, program, operations, pendingApprovals = 0, recruitingCount }: ProgramFindingInput): { alert?: string; phase?: string } {
  const at = (value: DateValue | null | undefined) => (value ? new Date(value) : undefined);
  const open = (start?: Date, end?: Date) => Boolean(start && end && start <= now && now < end);
  const md = (date: Date) => monthDay.format(date);

  const alert = operations && operations.overdue > 0
    ? `필수 보고서 기한을 넘긴 프로젝트가 ${operations.overdue}개입니다.`
    : pendingApprovals > 0
      ? `승인을 기다리는 프로젝트가 ${pendingApprovals}개입니다.`
      : operations?.showTeam && operations.unassigned > 0
        ? `팀을 꾸리지 못한 프로젝트가 ${operations.unassigned}개입니다.`
        : operations && operations.total === 0
          ? "아직 등록된 프로젝트가 없습니다."
          : undefined;

  const voteStart = at(program.votingPolicy?.startsAt);
  const voteEnd = at(program.votingPolicy?.endsAt);
  const recruitStart = at(program.recruitmentStartsAt);
  const recruitEnd = at(program.recruitmentEndsAt);
  const registrationStart = at(program.projectRegistrationStartsAt ?? program.startsAt);
  const registrationEnd = at(program.projectRegistrationEndsAt ?? program.endsAt);
  const executionStart = at(program.executionStartsAt);
  const executionEnd = at(program.executionEndsAt);
  const end = at(program.endsAt);

  let phase: string | undefined;
  if (voteEnd && open(voteStart, voteEnd)) {
    phase = `투표는 ${md(voteEnd)}까지 열려 있습니다.`;
  } else if (!program.studentProjectCreationEnabled && recruitEnd && open(recruitStart, recruitEnd)) {
    phase = recruitingCount === undefined
      ? `모집은 ${md(recruitEnd)}에 마감합니다.`
      : `지금 지원할 수 있는 프로젝트가 ${recruitingCount}개입니다. 모집은 ${md(recruitEnd)}에 마감합니다.`;
  } else if (program.studentProjectCreationEnabled && registrationEnd && open(registrationStart, registrationEnd)) {
    phase = `프로젝트 등록은 ${md(registrationEnd)}까지입니다.`;
  } else if (executionStart && executionStart > now) {
    phase = `수행은 ${md(executionStart)}에 시작합니다.`;
  } else if (executionEnd && executionEnd > now) {
    const left = daysUntil(executionEnd, now);
    phase = left === 0 ? "수행 기간이 오늘 끝납니다." : `수행 기간이 ${md(executionEnd)}에 끝납니다. ${left}일 남았습니다.`;
  } else if (end && end > now) {
    phase = `운영은 ${md(end)}에 끝납니다.`;
  } else if (end) {
    phase = "운영이 끝난 사업입니다.";
  }
  return { alert, phase };
}
