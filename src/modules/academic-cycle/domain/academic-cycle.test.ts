import { describe, expect, it } from "vitest";

import {
  assertValidAcademicCycle,
  InvalidAcademicCycleError,
} from "@/modules/academic-cycle/domain/academic-cycle";

describe("학기 식별 정책", () => {
  it.each(["FIRST", "SECOND"] as const)("%s 학기를 허용한다", (term) => {
    expect(() =>
      assertValidAcademicCycle({ academicYear: 2026, term }),
    ).not.toThrow();
  });

  it.each([1999, 10000, 2026.5, Number.NaN])(
    "유효하지 않은 학년도 %s를 거절한다",
    (academicYear) => {
      expect(() =>
        assertValidAcademicCycle({ academicYear, term: "FIRST" }),
      ).toThrow(InvalidAcademicCycleError);
    },
  );
});
