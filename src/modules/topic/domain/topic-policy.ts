import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type TopicSchedule = {
  recruitmentStartsAt: Date;
  executionStartsAt: Date;
  executionEndsAt: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
};

export type TopicPublication = {
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  publishedAt: Date | null;
};

export type TopicDetails = {
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  roleExpectations: string;
  availabilityRequirement: string;
  applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM";
  applicationQuestions: TopicApplicationQuestionDraft[];
  capacity: number;
};

type TopicApplicationQuestionDraft = {
  label: string;
  maxLength: number;
  required: boolean;
};

export class InvalidTopicDetailsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTopicDetailsError";
  }
}

export class InvalidTopicScheduleError extends Error {
  constructor(public readonly period: "execution" | "submission") {
    super(`${period} 기간의 시작 시각은 종료 시각보다 앞서야 합니다.`);
    this.name = "InvalidTopicScheduleError";
  }
}

export function assertValidTopicSchedule(schedule: TopicSchedule): void {
  const periods = [
    ["execution", schedule.executionStartsAt, schedule.executionEndsAt],
    ["submission", schedule.submissionStartsAt, schedule.submissionEndsAt],
  ] as const;

  for (const [name, startsAt, endsAt] of periods) {
    const startsAtTime = startsAt.getTime();
    const endsAtTime = endsAt.getTime();

    if (
      !Number.isFinite(startsAtTime) ||
      !Number.isFinite(endsAtTime) ||
      startsAtTime >= endsAtTime
    ) {
      throw new InvalidTopicScheduleError(name);
    }
  }

  if (!Number.isFinite(schedule.recruitmentStartsAt.getTime())) {
    throw new InvalidTopicScheduleError("execution");
  }
}

export function assertValidTopicDetails(details: TopicDetails): void {
  if (details.title.trim().length === 0 || details.title.length > 200) {
    throw new InvalidTopicDetailsError("주제 제목은 1자 이상 200자 이하여야 합니다.");
  }

  // 상한이 없으면 8,000자 초과 설명이 enqueueTranslations에서 throw되어
  // 주제 저장이 500으로 실패한다. 번역 한도(8,000)에 맞춰 세 계층(도메인·zod·textarea)을 통일한다.
  if (details.description.trim().length === 0 || details.description.length > 8_000) {
    throw new InvalidTopicDetailsError("주제 설명은 1자 이상 8,000자 이하여야 합니다.");
  }

  if (
    details.requiredSkills.length === 0 ||
    details.requiredSkills.length > 20 ||
    details.preferredSkills.length > 20 ||
    [...details.requiredSkills, ...details.preferredSkills].some(
      (skill) => skill.trim().length === 0 || skill.length > 50,
    )
  ) {
    throw new InvalidTopicDetailsError("필수 기술은 1개 이상이며 각 기술은 50자 이하여야 합니다.");
  }

  if (details.roleExpectations.trim().length === 0 || details.roleExpectations.length > 500) {
    throw new InvalidTopicDetailsError("예상 역할은 1자 이상 500자 이하여야 합니다.");
  }

  if (
    details.availabilityRequirement.trim().length === 0 ||
    details.availabilityRequirement.length > 500
  ) {
    throw new InvalidTopicDetailsError("활동 가능 시간 조건은 1자 이상 500자 이하여야 합니다.");
  }

  if (!Number.isSafeInteger(details.capacity) || details.capacity < 1) {
    throw new InvalidTopicDetailsError("모집 인원은 1명 이상의 정수여야 합니다.");
  }

  if (
    details.applicationQuestions.length === 0 ||
    details.applicationQuestions.length > 20 ||
    details.applicationQuestions.some((question) =>
      question.label.trim().length === 0 ||
      question.label.length > 200 ||
      !Number.isSafeInteger(question.maxLength) ||
      question.maxLength < 1 ||
      question.maxLength > 5_000
    )
  ) {
    throw new InvalidTopicDetailsError("지원서 문항은 1~20개이며 문항별 답변 제한은 1~5,000자여야 합니다.");
  }

  const labels = details.applicationQuestions.map(({ label }) => label.trim());
  if (new Set(labels).size !== labels.length) {
    throw new InvalidTopicDetailsError("같은 지원서 문항을 중복해 등록할 수 없습니다.");
  }
}

export function assertValidTopicPublication(
  publication: TopicPublication,
): void {
  const isDraftConsistent =
    publication.status === "DRAFT" && publication.publishedAt === null;
  const isPublishedConsistent =
    publication.status !== "DRAFT" &&
    publication.publishedAt !== null &&
    Number.isFinite(publication.publishedAt.getTime());

  if (!isDraftConsistent && !isPublishedConsistent) {
    throw new InvalidTopicDetailsError(
      "초안은 공개 시각이 없어야 하고 공개·마감 주제는 공개 시각이 필요합니다.",
    );
  }
}

export function canCreateTopic(actor: CurrentActor): boolean {
  return actor.role === "PROFESSOR" || actor.role === "ADMIN";
}

export function canManageTopic(
  actor: CurrentActor,
  managerId: string | null,
  assistantIds: string[] = [],
): boolean {
  return (
    actor.role === "ADMIN" ||
    (actor.role === "PROFESSOR" && actor.id === managerId) ||
    assistantIds.includes(actor.id)
  );
}
