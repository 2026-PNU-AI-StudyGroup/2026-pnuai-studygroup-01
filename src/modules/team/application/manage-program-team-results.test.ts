import { describe, expect, it, vi } from "vitest";

import { InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";
import { ProgramTeamResultService } from "@/modules/team/application/manage-program-team-results";

const admin = { id: "admin", role: "ADMIN" } as const;

describe("ProgramTeamResultService", () => {
  it("관리자는 번호와 수상 내역을 적을 수 있다", async () => {
    const saveResults = vi.fn(async () => 2);

    const changed = await new ProgramTeamResultService({ saveResults }).save(admin, "program-1", [
      { teamId: "team-1", number: 1, award: "대상 · 인기상" },
      { teamId: "team-2", number: null, award: null },
    ]);

    expect(changed).toBe(2);
    expect(saveResults).toHaveBeenCalledWith("program-1", [
      { teamId: "team-1", number: 1, award: "대상 · 인기상" },
      { teamId: "team-2", number: null, award: null },
    ]);
  });

  it("학생은 적을 수 없다", async () => {
    const saveResults = vi.fn(async () => 0);

    await expect(new ProgramTeamResultService({ saveResults }).save({ id: "student", role: "STUDENT" }, "program-1", [
      { teamId: "team-1", number: null, award: "대상" },
    ])).rejects.toBeInstanceOf(InvalidProjectProgramError);
    expect(saveResults).not.toHaveBeenCalled();
  });
});
