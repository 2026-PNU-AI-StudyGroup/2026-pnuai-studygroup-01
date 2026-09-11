import { describe, expect, it, vi } from "vitest";

import { InvalidProjectProgramError } from "@/modules/project-program/domain/project-program-policy";
import { ProgramAwardService } from "@/modules/team/application/manage-program-awards";

const admin = { id: "admin", role: "ADMIN" } as const;

describe("ProgramAwardService", () => {
  it("관리자는 수상 내역을 적을 수 있다", async () => {
    const saveAwards = vi.fn(async () => 2);

    const changed = await new ProgramAwardService({ saveAwards }).save(admin, "program-1", [
      { teamId: "team-1", award: "대상 · 인기상" },
      { teamId: "team-2", award: null },
    ]);

    expect(changed).toBe(2);
    expect(saveAwards).toHaveBeenCalledWith("program-1", [
      { teamId: "team-1", award: "대상 · 인기상" },
      { teamId: "team-2", award: null },
    ]);
  });

  it("학생은 수상 내역을 적을 수 없다", async () => {
    const saveAwards = vi.fn(async () => 0);

    await expect(new ProgramAwardService({ saveAwards }).save({ id: "student", role: "STUDENT" }, "program-1", [
      { teamId: "team-1", award: "대상" },
    ])).rejects.toBeInstanceOf(InvalidProjectProgramError);
    expect(saveAwards).not.toHaveBeenCalled();
  });
});
