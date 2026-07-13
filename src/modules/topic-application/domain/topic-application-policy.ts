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
