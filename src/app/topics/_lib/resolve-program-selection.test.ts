import { describe, expect, it } from "vitest";

import { resolveProgramSelection } from "@/app/topics/_lib/resolve-program-selection";

describe("resolveProgramSelection", () => {
  const programs = [{ id: "recent-program" }, { id: "older-program" }];

  it("요청한 프로그램이 없으면 최신순 목록의 첫 프로그램을 선택한다", () => {
    expect(resolveProgramSelection(undefined, programs)).toBe("recent-program");
    expect(resolveProgramSelection("missing-program", programs)).toBe("recent-program");
  });

  it("유효한 프로그램 선택과 빈 목록을 그대로 처리한다", () => {
    expect(resolveProgramSelection("older-program", programs)).toBe("older-program");
    expect(resolveProgramSelection(undefined, [])).toBeUndefined();
  });
});
