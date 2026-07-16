import { describe, expect, it } from "vitest";

import { InvalidStudentProfileError, normalizeStudentProfile } from "./student-profile";

describe("학생 프로젝트 프로필", () => {
  it("태그 중복과 공백을 제거한다", () => {
    expect(normalizeStudentProfile({ interests: [" 접근성 ", "접근성"], skills: ["TypeScript", " Figma "], desiredRole: " 프론트엔드 ", availability: " 평일 저녁 ", bio: " 사용자 문제를 해결하고 싶습니다. " })).toEqual({
      interests: ["접근성"], skills: ["TypeScript", "Figma"], desiredRole: "프론트엔드", availability: "평일 저녁", bio: "사용자 문제를 해결하고 싶습니다.",
    });
  });

  it("필수 정보가 비어 있으면 거부한다", () => {
    expect(() => normalizeStudentProfile({ interests: [], skills: [], desiredRole: "", availability: "", bio: "" })).toThrow(InvalidStudentProfileError);
  });
});
