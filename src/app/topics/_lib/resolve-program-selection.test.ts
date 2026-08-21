import { describe, expect, it } from "vitest";

import { resolveProgramSelection } from "@/app/topics/_lib/resolve-program-selection";

describe("resolveProgramSelection", () => {
  const programs = [{ id: "recent-program" }, { id: "older-program" }];

  it("사이드바 순서가 없으면 목록 첫 프로그램을 선택한다", () => {
    expect(resolveProgramSelection(undefined, programs)).toBe("recent-program");
    expect(resolveProgramSelection("missing-program", programs)).toBe("recent-program");
  });

  it("사이드바 목록 맨 위 프로그램을 연다", () => {
    // 목록 맨 위는 해커톤인데 눌러 보면 다른 프로그램이 열리던 어긋남을 막는다.
    const sidebarOrder = ["older-program", "recent-program"];

    expect(resolveProgramSelection(undefined, programs, sidebarOrder)).toBe("older-program");
  });

  it("사이드바 순서에 있어도 고를 수 없는 프로그램은 건너뛴다", () => {
    // 종료된 프로그램은 사이드바에는 남지만 기본 선택 대상이 아니다.
    const sidebarOrder = ["closed-program", "recent-program"];

    expect(resolveProgramSelection(undefined, programs, sidebarOrder)).toBe("recent-program");
  });

  it("직접 고른 프로그램은 사이드바 순서보다 우선한다", () => {
    expect(resolveProgramSelection("older-program", programs, ["recent-program"])).toBe("older-program");
  });

  it("빈 목록은 그대로 처리한다", () => {
    expect(resolveProgramSelection(undefined, [])).toBeUndefined();
    expect(resolveProgramSelection(undefined, [], ["anything"])).toBeUndefined();
  });
});
