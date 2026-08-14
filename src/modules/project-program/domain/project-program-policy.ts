import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { isProgramIconKey, type ProgramIconKey } from "@/modules/project-program/domain/program-icon";

export type VoteLimitScope = "PROGRAM" | "DIVISION";

export type ProgramVotingPolicyDetails = {
  startsAt: Date;
  endsAt: Date;
  voteLimit: number;
  staffVoteLimit?: number;
  voteLimitScope?: VoteLimitScope;
  selfVotingAllowed: boolean;
  resultsVisibleDuringVoting: boolean;
  resultsVisibleAfterVoting: boolean;
};

export type ProjectProgramDetails = {
  name: string;
  category: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  projectRegistrationStartsAt: Date;
  projectRegistrationEndsAt: Date;
  recruitmentStartsAt: Date | null;
  recruitmentEndsAt: Date | null;
  executionStartsAt: Date;
  executionEndsAt: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  advisorEnabled: boolean;
  studentProjectCreationEnabled: boolean;
  projectTeamMinSize?: number;
  projectTeamMaxSize?: number;
  icon: ProgramIconKey;
};

export const DEFAULT_PROJECT_TEAM_MIN_SIZE = 2;
export const DEFAULT_PROJECT_TEAM_MAX_SIZE = 6;

export type ProgramSchedule = Pick<ProjectProgramDetails,
  "recruitmentStartsAt" | "recruitmentEndsAt" |
  "executionStartsAt" | "executionEndsAt" |
  "submissionStartsAt" | "submissionEndsAt"
>;

export class InvalidProjectProgramError extends Error {}

const programStartYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
});

export function getProgramStartYear(startsAt: Date): number {
  return Number(programStartYearFormatter.format(startsAt));
}

export function normalizeProjectProgram(input: ProjectProgramDetails): ProjectProgramDetails {
  const value = {
    ...input,
    name: input.name.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    projectTeamMinSize: input.studentProjectCreationEnabled
      ? input.projectTeamMinSize ?? DEFAULT_PROJECT_TEAM_MIN_SIZE
      : 1,
    projectTeamMaxSize: input.projectTeamMaxSize ?? DEFAULT_PROJECT_TEAM_MAX_SIZE,
    recruitmentStartsAt: input.studentProjectCreationEnabled ? null : input.recruitmentStartsAt,
    recruitmentEndsAt: input.studentProjectCreationEnabled ? null : input.recruitmentEndsAt,
  };
  if (!value.name || value.name.length > 200) throw new InvalidProjectProgramError("프로그램명은 1자 이상 200자 이하여야 합니다.");
  if (!value.category || value.category.length > 100) throw new InvalidProjectProgramError("분류는 1자 이상 100자 이하여야 합니다.");
  if (!value.description || value.description.length > 5000) throw new InvalidProjectProgramError("설명은 1자 이상 5000자 이하여야 합니다.");
  if (!Number.isFinite(value.startsAt.getTime()) || !Number.isFinite(value.endsAt.getTime()) || value.startsAt >= value.endsAt) throw new InvalidProjectProgramError("프로그램 시작 시각은 종료 시각보다 앞서야 합니다.");
  assertProjectRegistrationPeriod(value.projectRegistrationStartsAt, value.projectRegistrationEndsAt);
  if (value.projectRegistrationStartsAt < value.startsAt || value.projectRegistrationEndsAt > value.endsAt) {
    throw new InvalidProjectProgramError("프로젝트 등록 기간은 프로그램 운영 기간 안에 있어야 합니다.");
  }
  if (!value.studentProjectCreationEnabled && (!value.recruitmentStartsAt || !value.recruitmentEndsAt)) {
    throw new InvalidProjectProgramError("등록 프로젝트 직접 지원 방식에서는 프로젝트 모집 기간을 입력해 주세요.");
  }
  assertValidProgramSchedule(value);
  assertValidProjectTeamSizePolicy(value.projectTeamMinSize, value.projectTeamMaxSize);
  if (!isProgramIconKey(value.icon)) throw new InvalidProjectProgramError("프로그램 아이콘을 다시 선택해 주세요.");
  return value;
}

export function assertValidProjectTeamSizePolicy(minSize: number, maxSize: number) {
  if (!Number.isSafeInteger(minSize) || minSize < 1) {
    throw new InvalidProjectProgramError("프로젝트 팀 최소 인원은 1명 이상이어야 합니다.");
  }
  if (!Number.isSafeInteger(maxSize) || maxSize < minSize || maxSize > 100) {
    throw new InvalidProjectProgramError("프로젝트 팀 최대 인원은 최소 인원 이상 100명 이하여야 합니다.");
  }
}

export function normalizeProgramVotingPolicy(input: ProgramVotingPolicyDetails): ProgramVotingPolicyDetails {
  assertValidPeriod(input.startsAt, input.endsAt, "투표 시작 시각은 종료 시각보다 앞서야 합니다.");
  if (!Number.isSafeInteger(input.voteLimit) || input.voteLimit < 1) {
    throw new InvalidProjectProgramError("인당 가능 투표수는 1 이상이어야 합니다.");
  }
  const staffVoteLimit = input.staffVoteLimit ?? 5;
  if (!Number.isSafeInteger(staffVoteLimit) || staffVoteLimit < 1) {
    throw new InvalidProjectProgramError("자문위원·관리자 가능 투표수는 1 이상이어야 합니다.");
  }
  if (input.voteLimitScope !== undefined && input.voteLimitScope !== "PROGRAM" && input.voteLimitScope !== "DIVISION") {
    throw new InvalidProjectProgramError("투표 범위를 다시 선택해 주세요.");
  }
  return { ...input, staffVoteLimit, voteLimitScope: input.voteLimitScope ?? "PROGRAM" };
}

export function assertProjectRegistrationPeriod(startsAt: Date, endsAt: Date) {
  assertValidPeriod(startsAt, endsAt, "프로젝트 등록 시작 시각은 종료 시각보다 앞서야 합니다.");
}

export function assertValidProgramSchedule(schedule: Pick<ProjectProgramDetails,
  "startsAt" | "endsAt" |
  "recruitmentStartsAt" | "recruitmentEndsAt" |
  "executionStartsAt" | "executionEndsAt" |
  "submissionStartsAt" | "submissionEndsAt"
>) {
  const hasRecruitmentPeriod = schedule.recruitmentStartsAt !== null || schedule.recruitmentEndsAt !== null;
  if (hasRecruitmentPeriod && (!schedule.recruitmentStartsAt || !schedule.recruitmentEndsAt)) {
    throw new InvalidProjectProgramError("프로젝트 모집 기간의 시작과 종료를 함께 입력해 주세요.");
  }
  const periods = [
    ...(schedule.recruitmentStartsAt && schedule.recruitmentEndsAt ? [["프로젝트 모집", schedule.recruitmentStartsAt, schedule.recruitmentEndsAt] as const] : []),
    ["수행", schedule.executionStartsAt, schedule.executionEndsAt],
    ["제출", schedule.submissionStartsAt, schedule.submissionEndsAt],
  ] as const;
  for (const [name, startsAt, endsAt] of periods) {
    assertValidPeriod(startsAt, endsAt, `${name} 시작 시각은 종료 시각보다 앞서야 합니다.`);
    if (startsAt < schedule.startsAt || endsAt > schedule.endsAt) {
      throw new InvalidProjectProgramError(`${name} 기간은 프로그램 운영 기간 안에 있어야 합니다.`);
    }
  }
}

export function isProgramRecruitmentOpen(
  program: Pick<ProjectProgramDetails, "recruitmentStartsAt" | "recruitmentEndsAt">,
  now: Date,
) {
  return Boolean(
    program.recruitmentStartsAt &&
    program.recruitmentEndsAt &&
    program.recruitmentStartsAt <= now &&
    now < program.recruitmentEndsAt,
  );
}

export function isProjectRegistrationOpen(
  program: Pick<ProjectProgramDetails, "startsAt" | "endsAt"> & Partial<Pick<ProjectProgramDetails, "projectRegistrationStartsAt" | "projectRegistrationEndsAt">>,
  now: Date,
) {
  const startsAt = program.projectRegistrationStartsAt ?? program.startsAt;
  const endsAt = program.projectRegistrationEndsAt ?? program.endsAt;
  return startsAt <= now && now < endsAt;
}

export function isProgramVotingOpen(
  policy: Pick<ProgramVotingPolicyDetails, "startsAt" | "endsAt"> | null | undefined,
  now: Date,
) {
  return Boolean(policy && policy.startsAt <= now && now < policy.endsAt);
}

function assertValidPeriod(startsAt: Date, endsAt: Date, message: string) {
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
    throw new InvalidProjectProgramError(message);
  }
}

export function assertProgramAdmin(actor: CurrentActor) {
  if (actor.role !== "ADMIN") throw new InvalidProjectProgramError("관리자만 프로그램을 개설하고 상태를 변경할 수 있습니다.");
}
