import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class InvalidTaskError extends Error {
  constructor() {
    super("할 일 제목은 1자 이상 200자 이하여야 합니다.");
    this.name = "InvalidTaskError";
  }
}

export class InvalidDiscussionPostError extends Error {
  constructor() {
    super("메시지는 1자 이상 2,000자 이하여야 합니다.");
    this.name = "InvalidDiscussionPostError";
  }
}

export function canAccessTeam(
  actor: CurrentActor,
  access: { isMember: boolean; isProfessor: boolean; isAssistant?: boolean },
): boolean {
  return (
    actor.role === "ADMIN" ||
    (actor.role === "STUDENT" && access.isMember) ||
    (actor.role === "PROFESSOR" && access.isProfessor) ||
    access.isAssistant === true
  );
}

export function assertValidTaskDueAt(dueAt: Date): void {
  if (!Number.isFinite(dueAt.getTime())) {
    throw new InvalidTaskError();
  }
}

export function normalizeTaskTitle(title: string): string {
  const normalized = title.trim();
  if (normalized.length < 1 || normalized.length > 200) {
    throw new InvalidTaskError();
  }
  return normalized;
}

export function normalizeDiscussionPost(content: string): string {
  const normalized = content.trim();
  if (normalized.length < 1 || normalized.length > 2_000) {
    throw new InvalidDiscussionPostError();
  }
  return normalized;
}
