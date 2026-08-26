/**
 * 확정된 프로젝트 팀에 뒤늦게 사람을 들이는 규칙.
 *
 * 사전 팀 초대와 달리 이미 굴러가는 프로젝트에 들어가는 일이라, 정원과 기간을 함께 본다.
 */

export type ProjectTeamInvitationViolation =
  | "FORBIDDEN"
  | "PROGRAM_CLOSED"
  | "NOT_INSTITUTION_EMAIL"
  | "ALREADY_MEMBER"
  | "CAPACITY_REACHED";

/** 초대는 지도교수와 조교, 관리자, 그리고 팀장만 보낼 수 있다. */
export function canInviteProjectTeamMember(access: {
  canSupervise: boolean;
  isTeamLeader: boolean;
}): boolean {
  return access.canSupervise || access.isTeamLeader;
}

/**
 * 초대를 보낼 수 있는 상태인지 본다.
 *
 * 상한은 프로그램이 정한 팀 최대 인원이다. 주제에도 정원이 있지만 그것은 처음 사람을
 * 모을 때 쓰는 목표치라, 세 명으로 등록한 팀은 그 값이 3 으로 굳는다. 그걸로 막으면
 * 나중에 한 명을 더 부르는 일 자체가 되지 않는다.
 *
 * 지금 팀에 남아 있는 사람과 아직 답을 안 한 초대를 함께 센다. 초대만 잔뜩 보내 놓고
 * 모두 수락하면 상한을 넘기기 때문이다.
 */
export function checkProjectTeamInvitation(input: {
  access: { canSupervise: boolean; isTeamLeader: boolean };
  programEndsAt: Date;
  now: Date;
  email: string;
  memberCount: number;
  pendingInvitationCount: number;
  /** 프로그램이 정한 팀 최대 인원. 주제의 모집 정원과 다른 값이다. */
  teamMaxSize: number;
  inviteeAlreadyMember: boolean;
}): ProjectTeamInvitationViolation | null {
  if (!canInviteProjectTeamMember(input.access)) return "FORBIDDEN";
  if (input.programEndsAt <= input.now) return "PROGRAM_CLOSED";
  if (!isInstitutionEmail(input.email)) return "NOT_INSTITUTION_EMAIL";
  if (input.inviteeAlreadyMember) return "ALREADY_MEMBER";
  if (input.memberCount + input.pendingInvitationCount >= input.teamMaxSize) return "CAPACITY_REACHED";
  return null;
}

/** 학교 계정만 팀에 들어올 수 있다. 로그인 자체가 학교 계정으로만 열린다. */
export function isInstitutionEmail(email: string): boolean {
  return normalizeInvitationEmail(email).endsWith("@pusan.ac.kr");
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}
