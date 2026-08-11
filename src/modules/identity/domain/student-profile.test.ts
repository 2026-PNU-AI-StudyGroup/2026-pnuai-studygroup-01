import { describe, expect, it } from "vitest";

import { InvalidStudentProfileError, normalizeStudentProfile } from "./student-profile";

describe("학생 연락처", () => {
  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeStudentProfile({ phone: " 010-1234-5678 ", kakao: " pnu_id ", github: " https://github.com/pnu ", instagram: " https://instagram.com/pnu " })).toEqual({
      phone: "010-1234-5678", kakao: "pnu_id", github: "https://github.com/pnu", instagram: "https://instagram.com/pnu",
    });
  });

  it("비어 있어도 허용한다", () => {
    expect(normalizeStudentProfile({ phone: "", kakao: "", github: "", instagram: "" })).toEqual({ phone: "", kakao: "", github: "", instagram: "" });
  });

  it("길이 제한을 넘으면 거부한다", () => {
    expect(() => normalizeStudentProfile({ phone: "0".repeat(41), kakao: "", github: "", instagram: "" })).toThrow(InvalidStudentProfileError);
  });
});
