import { describe, expect, it } from "vitest";

import {
  canProvisionInstitutionUser,
  determineInitialRole,
  isPusanEmail,
  normalizeEmail,
} from "./user-role";

describe("identity role policy", () => {
  it("이메일 비교 전에 공백과 대소문자를 정규화한다", () => {
    expect(normalizeEmail(" Student@PUSAN.AC.KR ")).toBe(
      "student@pusan.ac.kr",
    );
  });

  it("부산대학교 이메일만 허용 대상으로 판단한다", () => {
    expect(isPusanEmail("student@pusan.ac.kr")).toBe(true);
    expect(isPusanEmail("student@pusan.ac.kr.example.com")).toBe(false);
    expect(isPusanEmail("student@gmail.com")).toBe(false);
  });

  it("Google에서 검증된 부산대학교 이메일만 사용자로 생성한다", () => {
    expect(canProvisionInstitutionUser("student@pusan.ac.kr", true)).toBe(
      true,
    );
    expect(canProvisionInstitutionUser("student@pusan.ac.kr", false)).toBe(
      false,
    );
    expect(canProvisionInstitutionUser("student@gmail.com", true)).toBe(false);
  });

  it("허용 목록에 등록된 사용자를 교수로 지정한다", () => {
    expect(
      determineInitialRole({
        isProfessorAllowlisted: true,
      }),
    ).toBe("PROFESSOR");
  });

  it("그 외 신규 사용자를 학생으로 지정한다", () => {
    expect(
      determineInitialRole({
        isProfessorAllowlisted: false,
      }),
    ).toBe("STUDENT");
  });
});
