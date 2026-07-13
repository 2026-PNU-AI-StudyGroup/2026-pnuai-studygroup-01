import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class InvalidMilestoneError extends Error {
  constructor() {
    super("마일스톤 제목은 1자 이상 200자 이하여야 합니다.");
    this.name = "InvalidMilestoneError";
  }
}

export class InvalidProgressUpdateError extends Error {
  constructor() {
    super("진행 내용과 입력 길이를 확인해 주세요.");
    this.name = "InvalidProgressUpdateError";
  }
}

export function canAccessTeam(
  actor: CurrentActor,
  access: { isMember: boolean; isProfessor: boolean },
): boolean {
  return (
    actor.role === "ADMIN" ||
    (actor.role === "STUDENT" && access.isMember) ||
    (actor.role === "PROFESSOR" && access.isProfessor)
  );
}

export function assertValidMilestoneDueAt(dueAt: Date): void {
  if (!Number.isFinite(dueAt.getTime())) {
    throw new InvalidMilestoneError();
  }
}

export function normalizeMilestoneTitle(title: string): string {
  const normalized = title.trim();
  if (normalized.length < 1 || normalized.length > 200) {
    throw new InvalidMilestoneError();
  }
  return normalized;
}

export function normalizeProgressUpdate(input: {
  content: string;
  risk: string;
  nextAction: string;
}) {
  const normalized = {
    content: input.content.trim(),
    risk: input.risk.trim(),
    nextAction: input.nextAction.trim(),
  };
  if (
    normalized.content.length < 1 ||
    normalized.content.length > 5_000 ||
    normalized.risk.length > 2_000 ||
    normalized.nextAction.length > 2_000
  ) {
    throw new InvalidProgressUpdateError();
  }
  return normalized;
}
