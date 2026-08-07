import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { isProgramIconKey, type ProgramIconKey } from "@/modules/project-program/domain/program-icon";

export type VotingIdentityVisibility = "ANONYMOUS" | "NAMED";

export type ProgramVotingPolicyDetails = {
  startsAt: Date;
  endsAt: Date;
  voteLimit: number;
  selfVotingAllowed: boolean;
  identityVisibility: VotingIdentityVisibility;
};

export type ProjectProgramDetails = {
  name: string;
  category: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  projectRegistrationStartsAt: Date;
  projectRegistrationEndsAt: Date;
  recruitmentEndsAt: Date;
  advisorEnabled: boolean;
  studentProjectCreationEnabled: boolean;
  icon: ProgramIconKey;
};

export class InvalidProjectProgramError extends Error {}

const programStartYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
});

export function getProgramStartYear(startsAt: Date): number {
  return Number(programStartYearFormatter.format(startsAt));
}

export function normalizeProjectProgram(input: ProjectProgramDetails): ProjectProgramDetails {
  const value = { ...input, name: input.name.trim(), category: input.category.trim(), description: input.description.trim() };
  if (!value.name || value.name.length > 200) throw new InvalidProjectProgramError("프로그램명은 1자 이상 200자 이하여야 합니다.");
  if (!value.category || value.category.length > 100) throw new InvalidProjectProgramError("분류는 1자 이상 100자 이하여야 합니다.");
  if (!value.description || value.description.length > 5000) throw new InvalidProjectProgramError("설명은 1자 이상 5000자 이하여야 합니다.");
  if (!Number.isFinite(value.startsAt.getTime()) || !Number.isFinite(value.endsAt.getTime()) || value.startsAt >= value.endsAt) throw new InvalidProjectProgramError("프로그램 시작 시각은 종료 시각보다 앞서야 합니다.");
  assertProjectRegistrationPeriod(value.projectRegistrationStartsAt, value.projectRegistrationEndsAt);
  assertProgramRecruitmentDeadline(value.recruitmentEndsAt, value.startsAt, value.endsAt);
  if (!isProgramIconKey(value.icon)) throw new InvalidProjectProgramError("프로그램 아이콘을 다시 선택해 주세요.");
  return value;
}

export function normalizeProgramVotingPolicy(input: ProgramVotingPolicyDetails): ProgramVotingPolicyDetails {
  assertValidPeriod(input.startsAt, input.endsAt, "투표 시작 시각은 종료 시각보다 앞서야 합니다.");
  if (!Number.isSafeInteger(input.voteLimit) || input.voteLimit < 1) {
    throw new InvalidProjectProgramError("인당 가능 투표수는 1 이상이어야 합니다.");
  }
  if (input.identityVisibility !== "ANONYMOUS" && input.identityVisibility !== "NAMED") {
    throw new InvalidProjectProgramError("투표 공개 방식을 다시 선택해 주세요.");
  }
  return { ...input };
}

export function assertProjectRegistrationPeriod(startsAt: Date, endsAt: Date) {
  assertValidPeriod(startsAt, endsAt, "프로젝트 등록 시작 시각은 종료 시각보다 앞서야 합니다.");
}

export function assertProgramRecruitmentDeadline(recruitmentEndsAt: Date, startsAt: Date, endsAt: Date) {
  if (
    !Number.isFinite(recruitmentEndsAt.getTime()) ||
    recruitmentEndsAt < startsAt ||
    recruitmentEndsAt > endsAt
  ) {
    throw new InvalidProjectProgramError("프로젝트 모집 마감은 프로그램 운영 기간 안에 있어야 합니다.");
  }
}

export function isProgramRecruitmentOpen(
  program: Pick<ProjectProgramDetails, "recruitmentEndsAt">,
  now: Date,
) {
  return now < program.recruitmentEndsAt;
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
  policy: ProgramVotingPolicyDetails | null | undefined,
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
