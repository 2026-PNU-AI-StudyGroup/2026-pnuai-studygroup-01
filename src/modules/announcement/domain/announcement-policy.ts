import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

export function canCreateAnnouncement(role: UserRole): boolean {
  return role === "PROFESSOR" || role === "ADMIN";
}

// 팀 공지는 팀원만, 프로그램 구성원 공지는 프로그램 소속만 열람한다.
// 전체 공지와 AUTHENTICATED 프로그램 공지는 로그인 사용자 누구나 열람한다.
export function canViewAnnouncement(
  audience: { role: UserRole; actorId: string; teamIds: string[]; programIds: string[] },
  announcement: {
    authorId: string;
    teamId: string | null;
    programId: string | null;
    visibility: "AUTHENTICATED" | "TARGET_MEMBERS";
  },
): boolean {
  if (audience.role === "ADMIN") return true;
  if (announcement.authorId === audience.actorId) return true;
  if (announcement.teamId) return audience.teamIds.includes(announcement.teamId);
  if (announcement.programId) {
    return announcement.visibility === "AUTHENTICATED" || audience.programIds.includes(announcement.programId);
  }
  return announcement.visibility === "AUTHENTICATED";
}

export function canManageAnnouncement(
  actor: CurrentActor,
  authorId: string,
): boolean {
  return actor.role === "ADMIN" ||
    (actor.role === "PROFESSOR" && actor.id === authorId);
}
