import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class TopicApplicationForbiddenError extends Error {
  constructor() {
    super("학생만 주제에 지원할 수 있습니다.");
    this.name = "TopicApplicationForbiddenError";
  }
}

export class InvalidTopicApplicationMessageError extends Error {
  constructor() {
    super("지원 메시지는 1자 이상 2000자 이하여야 합니다.");
    this.name = "InvalidTopicApplicationMessageError";
  }
}

export class InvalidTopicApplicationProfileError extends Error {
  constructor() {
    super("보유 기술, 희망 역할, 활동 가능 시간을 형식에 맞게 입력해 주세요.");
    this.name = "InvalidTopicApplicationProfileError";
  }
}

export function assertCanApplyToTopic(actor: CurrentActor): void {
  if (actor.role !== "STUDENT") {
    throw new TopicApplicationForbiddenError();
  }
}

export function normalizeApplicationMessage(message: string): string {
  const normalized = message.trim();
  if (normalized.length < 1 || normalized.length > 2_000) {
    throw new InvalidTopicApplicationMessageError();
  }
  return normalized;
}

export function normalizeApplicationProfile(input: {
  skills: string[];
  desiredRole: string;
  availability: string;
}) {
  const skills = [...new Set(input.skills.map((skill) => skill.trim()).filter(Boolean))];
  const desiredRole = input.desiredRole.trim();
  const availability = input.availability.trim();
  if (
    skills.length === 0 ||
    skills.length > 20 ||
    skills.some((skill) => skill.length > 50) ||
    desiredRole.length === 0 ||
    desiredRole.length > 500 ||
    availability.length === 0 ||
    availability.length > 500
  ) {
    throw new InvalidTopicApplicationProfileError();
  }
  return { skills, desiredRole, availability };
}
