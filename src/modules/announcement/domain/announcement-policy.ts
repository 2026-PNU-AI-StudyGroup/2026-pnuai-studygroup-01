import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

export function canCreateAnnouncement(role: UserRole): boolean {
  return role === "PROFESSOR" || role === "ADMIN";
}

export function canManageAnnouncement(
  actor: CurrentActor,
  authorId: string,
): boolean {
  return actor.role === "ADMIN" ||
    (actor.role === "PROFESSOR" && actor.id === authorId);
}
