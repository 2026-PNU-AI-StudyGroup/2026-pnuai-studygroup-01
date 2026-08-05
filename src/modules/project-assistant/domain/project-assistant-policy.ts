import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export function canAccessProfessorWorkspace(
  actor: CurrentActor,
  hasSupervisedTopic: boolean,
): boolean {
  return actor.role === "PROFESSOR" ||
    actor.role === "ADMIN" ||
    hasSupervisedTopic;
}
