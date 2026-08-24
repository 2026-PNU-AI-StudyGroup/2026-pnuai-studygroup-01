import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";

export function canCreateAnnouncement(role: UserRole): boolean {
  return role === "PROFESSOR" || role === "ADMIN";
}

export function canCreateSystemAnnouncement(role: UserRole): boolean {
  return role === "ADMIN";
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

// 팝업은 대상을 가리지 않고 로그인한 모든 사람 앞에 뜬다.
// 팀이나 프로그램을 지정한 공지에 붙이면 그 밖의 사람에게까지 내용이 새어 나간다.
export function allowsPopup(
  target: { teamId: string | null; programId: string | null },
): boolean {
  return target.teamId === null && target.programId === null;
}
