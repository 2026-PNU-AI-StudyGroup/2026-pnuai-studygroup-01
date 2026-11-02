import { describe, expect, it } from "vitest";

import { programFinding } from "@/app/topics/_lib/program-finding";

const program = {
  startsAt: "2026-03-01T00:00:00+09:00",
  endsAt: "2026-12-31T23:59:00+09:00",
  recruitmentStartsAt: "2026-03-01T00:00:00+09:00",
  recruitmentEndsAt: "2026-03-20T18:00:00+09:00",
  executionStartsAt: "2026-04-01T00:00:00+09:00",
  executionEndsAt: "2026-12-15T18:00:00+09:00",
};

describe("programFinding", () => {
  it("기한을 넘긴 보고서를 다른 무엇보다 먼저 말한다", () => {
    expect(programFinding({
      now: new Date("2026-11-02T12:00:00+09:00"),
      program,
      operations: { total: 4, unassigned: 1, overdue: 2, showTeam: true },
      pendingApprovals: 3,
    })).toEqual({
      alert: "필수 보고서 기한을 넘긴 프로젝트가 2개입니다.",
      phase: "수행 기간이 12월 15일에 끝납니다. 43일 남았습니다.",
    });
  });

  it("모집 중이면 지원할 수 있는 수와 마감일을 말한다", () => {
    expect(programFinding({ now: new Date("2026-03-10T09:00:00+09:00"), program, recruitingCount: 3 }).phase)
      .toBe("지금 지원할 수 있는 프로젝트가 3개입니다. 모집은 3월 20일에 마감합니다.");
  });

  it("끝난 사업은 끝났다고만 말한다", () => {
    expect(programFinding({ now: new Date("2027-01-05T09:00:00+09:00"), program })).toEqual({ phase: "운영이 끝난 사업입니다." });
  });
});
