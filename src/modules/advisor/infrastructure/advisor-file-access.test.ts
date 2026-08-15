import { describe, expect, it } from "vitest";

import { teamFileAccessWhere } from "@/modules/advisor/infrastructure/advisor-file-access";

describe("teamFileAccessWhere", () => {
  it("ADMIN은 조건 없이 전체 팀에 접근한다", () => {
    expect(teamFileAccessWhere({ id: "u1", role: "ADMIN" })).toEqual({});
  });

  it("ADVISOR는 배정된 topic의 팀만 접근한다", () => {
    expect(teamFileAccessWhere({ id: "adv-1", role: "ADVISOR" })).toEqual({
      project: { advisors: { some: { userId: "adv-1" } } },
    });
  });

  it("PROFESSOR/STUDENT는 기존 프로젝트 작업공간 권한 조건을 유지한다", () => {
    const where = teamFileAccessWhere({ id: "u1", role: "PROFESSOR" });
    expect(where).toMatchObject({
      AND: [
        { OR: [{ project: { program: { endsAt: { gt: expect.any(Date) } } } }, { confirmedAt: { not: null } }] },
        { OR: [{ OR: [{ project: { managerId: "u1" } }, { project: { assistants: { some: { userId: "u1" } } } }] }, { memberships: { some: { userId: "u1", endedAt: null } } }] },
      ],
    });
  });
});
