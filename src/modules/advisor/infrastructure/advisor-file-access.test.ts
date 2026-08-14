import { describe, expect, it } from "vitest";

import { teamFileAccessWhere } from "@/modules/advisor/infrastructure/advisor-file-access";

describe("teamFileAccessWhere", () => {
  it("ADMIN은 조건 없이 전체 팀에 접근한다", () => {
    expect(teamFileAccessWhere({ id: "u1", role: "ADMIN" })).toEqual({});
  });

  it("ADVISOR는 배정된 topic의 팀만 접근한다", () => {
    expect(teamFileAccessWhere({ id: "adv-1", role: "ADVISOR" })).toEqual({
      topic: { advisors: { some: { userId: "adv-1" } } },
    });
  });

  it("PROFESSOR/STUDENT는 담당·소속 팀 OR 조건을 사용한다", () => {
    const where = teamFileAccessWhere({ id: "u1", role: "PROFESSOR" });
    expect(where).toEqual({
      OR: [
        { OR: [{ professorId: "u1" }, { topic: { assistants: { some: { userId: "u1" } } } }] },
        { members: { some: { studentId: "u1" } } },
      ],
    });
  });
});
