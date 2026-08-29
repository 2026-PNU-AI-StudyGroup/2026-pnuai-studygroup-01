import { describe, expect, it } from "vitest";

import {
  canInviteProjectTeamMember,
  canJoinProjectTeam,
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
  teamMaxSize: 5,
  inviteeAlreadyMember: false,
  invitee: { role: "STUDENT", accountStatus: "ACTIVE" },
  inviteeInOtherProgramTeam: false,
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

describe("canJoinProjectTeam", () => {
  // 검사가 없던 동안 팀장이 지도교수 주소를 넣고 그 교수가 수락해 자기 팀의 팀원이 됐다.
  it("활성 학생만 팀원이 될 수 있다", () => {
    expect(canJoinProjectTeam({ role: "STUDENT", accountStatus: "ACTIVE" })).toBe(true);
    expect(canJoinProjectTeam({ role: "PROFESSOR", accountStatus: "ACTIVE" })).toBe(false);
    expect(canJoinProjectTeam({ role: "ADMIN", accountStatus: "ACTIVE" })).toBe(false);
    expect(canJoinProjectTeam({ role: "ADVISOR", accountStatus: "ACTIVE" })).toBe(false);
  });

  it("학생이어도 활성 계정이 아니면 막는다", () => {
    expect(canJoinProjectTeam({ role: "STUDENT", accountStatus: "WITHDRAWN" })).toBe(false);
  });

  it("아직 계정이 없는 주소는 통과시킨다", () => {
    // 첫 로그인에 STUDENT 로 만들어지고, 수락하는 순간 같은 검사를 다시 받는다.
    expect(canJoinProjectTeam(null)).toBe(true);
  });
});

describe("checkProjectTeamInvitation", () => {
  it("학생이 아닌 계정은 초대 단계에서 막는다", () => {
    expect(checkProjectTeamInvitation({
      ...base,
      invitee: { role: "PROFESSOR", accountStatus: "ACTIVE" },
    })).toBe("NOT_STUDENT");
  });

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

  it("같은 프로그램의 다른 팀에 속한 학생은 부를 수 없다", () => {
    // 예전 검사는 이 팀 안 중복만 봐서 한 학생이 같은 프로그램의 팀 두 곳에 들어갔다.
    expect(checkProjectTeamInvitation({ ...base, inviteeInOtherProgramTeam: true }))
      .toBe("ALREADY_IN_PROGRAM_TEAM");
  });

  it("아직 답을 안 한 초대까지 세어 상한을 지킨다", () => {
    // 팀원 2명에 대기 초대 3장이면 모두 수락할 때 상한 5명을 넘지 않는 선까지 찼다.
    expect(checkProjectTeamInvitation({ ...base, pendingInvitationCount: 3 })).toBe("CAPACITY_REACHED");
    expect(checkProjectTeamInvitation({ ...base, pendingInvitationCount: 2 })).toBeNull();
  });

  it("주제 모집 정원이 아니라 프로그램 팀 최대 인원으로 센다", () => {
    // 세 명으로 등록한 팀도 프로그램이 다섯 명까지 허용하면 두 명 더 부를 수 있다.
    expect(checkProjectTeamInvitation({ ...base, memberCount: 3, teamMaxSize: 5 })).toBeNull();
    expect(checkProjectTeamInvitation({ ...base, memberCount: 5, teamMaxSize: 5 })).toBe("CAPACITY_REACHED");
  });
});
