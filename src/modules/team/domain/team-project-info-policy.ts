import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class InvalidTeamProjectInfoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTeamProjectInfoError";
  }
}

export function normalizeTeamProjectInfo(input: {
  title: string;
  description: string;
}): { title: string; description: string } {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 1 || title.length > 200) {
    throw new InvalidTeamProjectInfoError("프로젝트명은 1자 이상 200자 이하여야 합니다.");
  }
  if (description.length < 1 || description.length > 8_000) {
    throw new InvalidTeamProjectInfoError("프로젝트 설명은 1자 이상 8,000자 이하여야 합니다.");
  }
  return { title, description };
}

export function canEditTeamProjectInfo(
  actor: CurrentActor,
  team: {
    professorId: string;
    assistantIds: string[];
    actorMemberRole: "LEADER" | "MEMBER" | null;
  },
): boolean {
  return actor.role === "ADMIN" ||
    team.professorId === actor.id ||
    team.assistantIds.includes(actor.id) ||
    team.actorMemberRole === "LEADER";
}
