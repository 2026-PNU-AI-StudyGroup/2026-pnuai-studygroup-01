import { describe, expect, it } from "vitest";

import { resolveProgramSelection } from "@/app/topics/_lib/resolve-program-selection";

describe("resolveProgramSelection", () => {
  const programs = [{ id: "recent-program" }, { id: "older-program" }];

  it("요청한 프로그램이 없으면 최신순 목록의 첫 프로그램을 선택한다", () => {
    expect(resolveProgramSelection(undefined, programs)).toBe("recent-program");
    expect(resolveProgramSelection("missing-program", programs)).toBe("recent-program");
  });

  it("투표 중인 프로그램이 있으면 그것을 먼저 연다", () => {
    // 예전에는 방금 만든 프로그램이 계속 먼저 떠서 운영 중인 프로그램을 매번 다시 골라야 했다.
    const now = new Date("2026-08-27T15:00:00Z");
    const withVoting = [
      { id: "new-program", startsAt: new Date("2026-08-25T00:00:00Z"), votingPolicy: null },
      {
        id: "hackathon",
        startsAt: new Date("2026-08-01T00:00:00Z"),
        votingPolicy: { startsAt: new Date("2026-08-27T04:00:00Z"), endsAt: new Date("2026-08-28T07:00:00Z") },
      },
    ];

    expect(resolveProgramSelection(undefined, withVoting, now)).toBe("hackathon");
    // 직접 고른 프로그램은 그대로 존중한다.
    expect(resolveProgramSelection("new-program", withVoting, now)).toBe("new-program");
  });

  it("투표가 아직 시작 전이어도 투표를 잡아 둔 프로그램을 먼저 연다", () => {
    // 방금 만든 프로그램이 아니라 지금 운영 중인 프로그램이 먼저 떠야 한다.
    const now = new Date("2026-08-21T00:00:00Z");
    const programs = [
      { id: "just-created", startsAt: new Date("2026-08-20T00:00:00Z"), votingPolicy: null },
      {
        id: "hackathon",
        startsAt: new Date("2026-01-31T00:00:00Z"),
        votingPolicy: { startsAt: new Date("2026-08-27T04:00:00Z"), endsAt: new Date("2026-08-28T07:00:00Z") },
      },
    ];

    expect(resolveProgramSelection(undefined, programs, now)).toBe("hackathon");
  });

  it("투표가 끝난 프로그램은 더 이상 먼저 열지 않는다", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    const programs = [
      { id: "just-created", startsAt: new Date("2026-08-20T00:00:00Z"), votingPolicy: null },
      {
        id: "hackathon",
        startsAt: new Date("2026-01-31T00:00:00Z"),
        votingPolicy: { startsAt: new Date("2026-08-27T04:00:00Z"), endsAt: new Date("2026-08-28T07:00:00Z") },
      },
    ];

    expect(resolveProgramSelection(undefined, programs, now)).toBe("just-created");
  });

  it("투표 중인 프로그램이 없으면 늦게 시작한 프로그램을 연다", () => {
    const now = new Date("2026-08-27T15:00:00Z");
    const programsByStart = [
      { id: "older", startsAt: new Date("2026-01-01T00:00:00Z") },
      { id: "newer", startsAt: new Date("2026-08-01T00:00:00Z") },
    ];

    expect(resolveProgramSelection(undefined, programsByStart, now)).toBe("newer");
  });

  it("유효한 프로그램 선택과 빈 목록을 그대로 처리한다", () => {
    expect(resolveProgramSelection("older-program", programs)).toBe("older-program");
    expect(resolveProgramSelection(undefined, [])).toBeUndefined();
  });
});
