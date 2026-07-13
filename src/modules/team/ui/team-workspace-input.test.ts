import { describe, expect, it } from "vitest";

import { milestoneInputSchema } from "@/modules/team/ui/team-workspace-input";

describe("마일스톤 폼 입력", () => {
  it("한국 날짜의 마지막 분을 UTC로 변환한다", () => {
    const input = milestoneInputSchema.parse({
      teamId: "1c845ddb-523c-4119-a054-91bfb928b78d",
      title: "중간 발표",
      dueAt: "2026-05-01",
    });
    expect(input.dueAt.toISOString()).toBe("2026-05-01T14:59:00.000Z");
  });

  it("실제 달력에 없는 날짜를 거절한다", () => {
    expect(
      milestoneInputSchema.safeParse({
        teamId: "1c845ddb-523c-4119-a054-91bfb928b78d",
        title: "중간 발표",
        dueAt: "2026-02-29",
      }).success,
    ).toBe(false);
  });
});
