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

  it("전화번호에 글자나 물음표가 들어가면 거부한다", () => {
    expect(() => normalizeStudentProfile({ phone: "010-abc?", kakao: "", github: "", instagram: "" })).toThrow(InvalidStudentProfileError);
  });

  it("카카오·GitHub·Instagram에 한글이나 공백이 들어가면 거부한다", () => {
    expect(() => normalizeStudentProfile({ phone: "", kakao: "카카오아이디", github: "", instagram: "" })).toThrow(InvalidStudentProfileError);
    expect(() => normalizeStudentProfile({ phone: "", kakao: "", github: "user name", instagram: "" })).toThrow(InvalidStudentProfileError);
  });

  it("정상 형식은 통과한다", () => {
    expect(normalizeStudentProfile({ phone: "010-1234-5678", kakao: "https://open.kakao.com/abc", github: "https://github.com/user", instagram: "user_name" }))
      .toEqual({ phone: "010-1234-5678", kakao: "https://open.kakao.com/abc", github: "https://github.com/user", instagram: "user_name" });
  });
});
