import { describe, expect, it } from "vitest";

import {
  canInviteProjectTeamMember,
  checkProjectTeamInvitation,
  isInstitutionEmail,
} from "@/modules/project-team/domain/project-team-invitation-policy";

const now = new Date("2026-08-26T00:00:00Z");
const later = new Date("2026-09-30T00:00:00Z");

const base = {
  access: { canSupervise: false, isTeamLeader: true },
  programEndsAt: later,
  now,
  email: "student@pusan.ac.kr",
  memberCount: 2,
  pendingInvitationCount: 0,
  capacity: 5,
  inviteeAlreadyMember: false,
};

describe("canInviteProjectTeamMember", () => {
  it("팀장과 감독 권한이 있는 사람만 부를 수 있다", () => {
    expect(canInviteProjectTeamMember({ canSupervise: false, isTeamLeader: true })).toBe(true);
    expect(canInviteProjectTeamMember({ canSupervise: true, isTeamLeader: false })).toBe(true);
    expect(canInviteProjectTeamMember({ canSupervise: false, isTeamLeader: false })).toBe(false);
  });
});

describe("isInstitutionEmail", () => {
  it("학교 주소만 받는다", () => {
    expect(isInstitutionEmail("student@pusan.ac.kr")).toBe(true);
    expect(isInstitutionEmail("  Student@PUSAN.AC.KR  ")).toBe(true);
    expect(isInstitutionEmail("student@gmail.com")).toBe(false);
  });
});

describe("checkProjectTeamInvitation", () => {
  it("조건이 맞으면 막지 않는다", () => {
    expect(checkProjectTeamInvitation(base)).toBeNull();
  });

  it("권한 없는 사람은 부를 수 없다", () => {
    expect(checkProjectTeamInvitation({
      ...base,
      access: { canSupervise: false, isTeamLeader: false },
    })).toBe("FORBIDDEN");
  });

  it("운영이 끝난 프로그램에는 부를 수 없다", () => {
    expect(checkProjectTeamInvitation({ ...base, programEndsAt: now })).toBe("PROGRAM_CLOSED");
  });

  it("학교 주소가 아니면 부를 수 없다", () => {
    expect(checkProjectTeamInvitation({ ...base, email: "someone@gmail.com" }))
      .toBe("NOT_INSTITUTION_EMAIL");
  });

  it("이미 팀원이면 부를 수 없다", () => {
    expect(checkProjectTeamInvitation({ ...base, inviteeAlreadyMember: true })).toBe("ALREADY_MEMBER");
  });

  it("아직 답을 안 한 초대까지 세어 정원을 지킨다", () => {
    // 팀원 2명에 대기 초대 3장이면 모두 수락할 때 정원 5명을 넘지 않는 선까지 찼다.
    expect(checkProjectTeamInvitation({ ...base, pendingInvitationCount: 3 })).toBe("CAPACITY_REACHED");
    expect(checkProjectTeamInvitation({ ...base, pendingInvitationCount: 2 })).toBeNull();
  });
});
