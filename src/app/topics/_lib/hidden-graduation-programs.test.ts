import { describe, expect, it } from "vitest";

import {
  HIDDEN_GRADUATION_PROGRAM_CATEGORY,
  hideGraduationProgramsForStudent,
  isHiddenGraduationProgram,
} from "@/app/topics/_lib/hidden-graduation-programs";

describe("학생 졸업과제 프로그램 임시 숨김", () => {
  it("데모 데이터의 정확한 분류만 숨긴다", () => {
    expect(isHiddenGraduationProgram(HIDDEN_GRADUATION_PROGRAM_CATEGORY)).toBe(true);
    expect(isHiddenGraduationProgram("캡스톤")).toBe(false);
    expect(isHiddenGraduationProgram("CSE 캡스톤 디자인 특별 과정")).toBe(false);
  });

  it("학생에게만 정확한 분류를 제거한다", () => {
    const programs = [
      { id: "hidden", category: HIDDEN_GRADUATION_PROGRAM_CATEGORY },
      { id: "visible", category: "캡스톤 특별 과정" },
    ];

    expect(hideGraduationProgramsForStudent(programs, "STUDENT")).toEqual([programs[1]]);
    expect(hideGraduationProgramsForStudent(programs, "PROFESSOR")).toEqual(programs);
  });
});
