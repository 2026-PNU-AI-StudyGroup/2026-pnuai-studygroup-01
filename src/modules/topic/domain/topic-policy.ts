import type { UserRole } from "@/modules/identity/domain/user-role";

export type TopicSchedule = {
  recruitmentStartsAt: Date;
  recruitmentEndsAt: Date;
  executionStartsAt: Date;
  executionEndsAt: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
};

export type TopicActor = {
  id: string;
  role: UserRole;
};

export type TopicPublication = {
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  publishedAt: Date | null;
};

export type TopicDetails = {
  title: string;
  description: string;
  capacity: number;
};

export class InvalidTopicDetailsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTopicDetailsError";
  }
}

export class InvalidTopicScheduleError extends Error {
  constructor(public readonly period: "recruitment" | "execution" | "submission") {
    super(`${period} 기간의 시작 시각은 종료 시각보다 앞서야 합니다.`);
    this.name = "InvalidTopicScheduleError";
  }
}

export function assertValidTopicSchedule(schedule: TopicSchedule): void {
  const periods = [
    ["recruitment", schedule.recruitmentStartsAt, schedule.recruitmentEndsAt],
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
}

export function assertValidTopicDetails(details: TopicDetails): void {
  if (details.title.trim().length === 0) {
    throw new InvalidTopicDetailsError("주제 제목은 비어 있을 수 없습니다.");
  }

  if (details.description.trim().length === 0) {
    throw new InvalidTopicDetailsError("주제 설명은 비어 있을 수 없습니다.");
  }

  if (!Number.isSafeInteger(details.capacity) || details.capacity < 1) {
    throw new InvalidTopicDetailsError("모집 인원은 1명 이상의 정수여야 합니다.");
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

export function canCreateTopic(actor: TopicActor): boolean {
  return actor.role === "PROFESSOR" || actor.role === "ADMIN";
}

export function canManageTopic(actor: TopicActor, authorId: string): boolean {
  return actor.role === "ADMIN" || actor.id === authorId;
}
