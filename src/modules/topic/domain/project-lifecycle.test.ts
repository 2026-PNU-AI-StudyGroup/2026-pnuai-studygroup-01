import { describe, expect, it } from "vitest";

import { effectiveProjectStatus, isProgramEnded } from "@/modules/topic/domain/project-lifecycle";

const endsAt = new Date("2026-12-20T15:00:00.000Z");

describe("프로젝트 파생 생명주기", () => {
  it("프로그램 종료 전에는 승인 상태와 팀 확정 여부만 반영한다", () => {
    const now = new Date(endsAt.getTime() - 1);

    expect(effectiveProjectStatus({ status: "PENDING_APPROVAL", programEndsAt: endsAt, confirmedAt: null }, now)).toBe("PENDING_APPROVAL");
    expect(effectiveProjectStatus({ status: "REJECTED", programEndsAt: endsAt, confirmedAt: null }, now)).toBe("REJECTED");
    expect(effectiveProjectStatus({ status: "ACTIVE", programEndsAt: endsAt, confirmedAt: null }, now)).toBe("FORMING");
    expect(effectiveProjectStatus({ status: "ACTIVE", programEndsAt: endsAt, confirmedAt: new Date() }, now)).toBe("IN_PROGRESS");
  });

  it("종료 시각부터 확정 팀은 완료, 나머지는 취소로 파생한다", () => {
    expect(isProgramEnded(endsAt, endsAt)).toBe(true);
    expect(effectiveProjectStatus({ status: "ACTIVE", programEndsAt: endsAt, confirmedAt: new Date() }, endsAt)).toBe("COMPLETED");
    expect(effectiveProjectStatus({ status: "ACTIVE", programEndsAt: endsAt, confirmedAt: null }, endsAt)).toBe("CANCELED");
    expect(effectiveProjectStatus({ status: "PENDING_APPROVAL", programEndsAt: endsAt, confirmedAt: null }, endsAt)).toBe("CANCELED");
  });

  it("종료일을 연장하면 저장 상태 변경 없이 다시 진행 상태가 된다", () => {
    const afterOriginalEnd = new Date("2026-12-21T00:00:00.000Z");
    const extendedEnd = new Date("2027-01-31T15:00:00.000Z");

    expect(effectiveProjectStatus({ status: "ACTIVE", programEndsAt: endsAt, confirmedAt: new Date() }, afterOriginalEnd)).toBe("COMPLETED");
    expect(effectiveProjectStatus({ status: "ACTIVE", programEndsAt: extendedEnd, confirmedAt: new Date() }, afterOriginalEnd)).toBe("IN_PROGRESS");
  });
});
