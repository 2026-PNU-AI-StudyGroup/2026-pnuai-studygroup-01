import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

export function canCreateAnnouncement(role: UserRole): boolean {
  return role === "PROFESSOR" || role === "ADMIN";
}

// 대상이 지정된 공지는 본인 소속(팀·프로그램)·작성자·관리자만 열람. 전체 공지는 누구나.
export function canViewAnnouncement(
  audience: { role: UserRole; actorId: string; teamIds: string[]; programIds: string[] },
  announcement: { authorId: string; teamId: string | null; programId: string | null },
): boolean {
  if (audience.role === "ADMIN") return true;
  if (announcement.authorId === audience.actorId) return true;
  if (announcement.teamId) return audience.teamIds.includes(announcement.teamId);
  if (announcement.programId) return audience.programIds.includes(announcement.programId);
  return true;
}

export function canManageAnnouncement(
  actor: CurrentActor,
  authorId: string,
): boolean {
  return actor.role === "ADMIN" ||
    (actor.role === "PROFESSOR" && actor.id === authorId);
}
