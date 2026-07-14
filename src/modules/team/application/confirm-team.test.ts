import { describe, expect, it, vi } from "vitest";

import {
  ConfirmTeamService,
  TeamConfirmationNotAllowedError,
  type TeamConfirmationWriter,
} from "@/modules/team/application/confirm-team";

describe("팀 확정", () => {
  it("지도교수가 자신의 구성 중인 팀을 확정한다", async () => {
    const writer: TeamConfirmationWriter = { confirm: vi.fn(async () => true) };
    await new ConfirmTeamService(writer).confirm(
      { id: "professor-1", role: "PROFESSOR" },
      "team-1",
    );
    expect(writer.confirm).toHaveBeenCalled();
  });

  it("학생의 팀 확정을 영속화 전에 거부한다", async () => {
    const writer: TeamConfirmationWriter = { confirm: vi.fn(async () => true) };
    await expect(
      new ConfirmTeamService(writer).confirm(
        { id: "student-1", role: "STUDENT" },
        "team-1",
      ),
    ).rejects.toBeInstanceOf(TeamConfirmationNotAllowedError);
    expect(writer.confirm).not.toHaveBeenCalled();
  });
});
