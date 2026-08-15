import { describe, expect, it } from "vitest";

import {
  InvalidStudentOnboardingProfileError,
  needsStudentOnboardingAfterRoleChange,
  normalizeStudentOnboardingProfile,
} from "@/modules/identity/domain/student-onboarding";

describe("신규 학생 가입 정보", () => {
  it("공백과 연락처 형식을 정규화한다", () => {
    expect(normalizeStudentOnboardingProfile({
      name: " 김  학생 ",
      department: " 정보컴퓨터공학부 ",
      studentNumber: "2026-12345",
      grade: 2,
      phoneNumber: "010-1234-5678",
      contactEmail: " Student@Example.com ",
    })).toEqual({
      name: "김 학생",
      department: "정보컴퓨터공학부",
      studentNumber: "202612345",
      grade: 2,
      phoneNumber: "01012345678",
      contactEmail: "student@example.com",
    });
  });

  it("학번, 학년, 연락처와 이메일 형식이 유효해야 한다", () => {
    expect(() => normalizeStudentOnboardingProfile({
      name: "김학생",
      department: "정보컴퓨터공학부",
      studentNumber: "학번",
      grade: 0,
      phoneNumber: "전화번호",
      contactEmail: "이메일",
    })).toThrow(InvalidStudentOnboardingProfileError);
  });

  it("교수 권한 회수 뒤 학생 필수 정보가 없으면 온보딩을 다시 요구한다", () => {
    const complete = {
      department: "정보컴퓨터공학부",
      studentNumber: "202612345",
      grade: 2,
      phoneNumber: "01012345678",
      contactEmail: "student@example.com",
      onboardingCompletedAt: new Date("2026-08-01T00:00:00Z"),
    };

    expect(needsStudentOnboardingAfterRoleChange(complete)).toBe(false);
    expect(needsStudentOnboardingAfterRoleChange({ ...complete, studentNumber: null })).toBe(true);
    expect(needsStudentOnboardingAfterRoleChange({ ...complete, onboardingCompletedAt: null })).toBe(true);
  });
});
