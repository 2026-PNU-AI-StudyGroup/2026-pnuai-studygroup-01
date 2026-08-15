import { describe, expect, it } from "vitest";

import { roleForAcceptedTeamMember } from "@/modules/team/domain/team-leadership";

describe("실행 팀장 지정 정책", () => {
  it("첫 승인자만 팀장으로 지정한다", () => {
    expect(roleForAcceptedTeamMember(0)).toBe("LEADER");
    expect(roleForAcceptedTeamMember(1)).toBe("MEMBER");
  });

  it("첫 승인 팀 지원에서는 지원 대표만 팀장으로 지정한다", () => {
    expect(roleForAcceptedTeamMember(0, true)).toBe("LEADER");
    expect(roleForAcceptedTeamMember(0, false)).toBe("MEMBER");
  });
});
