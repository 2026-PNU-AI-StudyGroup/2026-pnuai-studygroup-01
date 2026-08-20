import { describe, expect, it } from "vitest";

import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";

describe("팀 상태 표현", () => {
  it("모든 상태의 라벨과 톤을 동일한 계약으로 제공한다", () => {
    expect(teamStatusPresentation).toEqual({
      FORMING: { label: "구성 중", tone: "warning" },
      IN_PROGRESS: { label: "진행 중", tone: "info" },
      COMPLETED: { label: "완료", tone: "success" },
      CANCELED: { label: "취소", tone: "danger" },
    });
  });
});
