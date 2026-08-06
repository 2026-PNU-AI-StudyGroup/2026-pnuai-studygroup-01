import { describe, expect, it } from "vitest";

import {
  canAccessTeam,
  normalizeDiscussionPost,
  normalizeTaskTitle,
} from "@/modules/team/domain/team-workspace-policy";

describe("팀 워크스페이스 권한", () => {
  it("팀원과 지도교수, 관리자의 접근을 허용한다", () => {
    expect(
      canAccessTeam(
        { id: "student", role: "STUDENT" },
        { isMember: true, isProfessor: false },
      ),
    ).toBe(true);
    expect(
      canAccessTeam(
        { id: "professor", role: "PROFESSOR" },
        { isMember: false, isProfessor: true },
      ),
    ).toBe(true);
    expect(
      canAccessTeam(
        { id: "admin", role: "ADMIN" },
        { isMember: false, isProfessor: false },
      ),
    ).toBe(true);
  });

  it("관계없는 사용자의 접근을 거절한다", () => {
    expect(
      canAccessTeam(
        { id: "other", role: "STUDENT" },
        { isMember: false, isProfessor: false },
      ),
    ).toBe(false);
    expect(
      canAccessTeam(
        { id: "professor", role: "STUDENT" },
        { isMember: false, isProfessor: true },
      ),
    ).toBe(false);
  });

  it("계정 역할과 무관하게 프로젝트 조교의 접근을 허용한다", () => {
    expect(
      canAccessTeam(
        { id: "assistant", role: "STUDENT" },
        { isMember: false, isProfessor: false, isAssistant: true },
      ),
    ).toBe(true);
  });
});

describe("팀 기록 정규화", () => {
  it("할 일과 대화의 앞뒤 공백을 제거한다", () => {
    expect(normalizeTaskTitle("  중간 발표  ")).toBe("중간 발표");
    expect(normalizeDiscussionPost("  이번 주 회의는 금요일입니다.  ")).toBe(
      "이번 주 회의는 금요일입니다.",
    );
  });
});
