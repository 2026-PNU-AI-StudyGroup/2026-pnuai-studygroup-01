import { describe, expect, it } from "vitest";

import { topicApplicationStatusPresentation } from "@/modules/topic-application/ui/topic-application-status-presentation";

describe("주제 지원 상태 표현", () => {
  it("모든 상태의 라벨과 톤을 동일한 계약으로 제공한다", () => {
    expect(topicApplicationStatusPresentation).toEqual({
      PENDING: { label: "검토 중", tone: "info" },
      ACCEPTED: { label: "선정", tone: "success" },
      REJECTED: { label: "미선정", tone: "danger" },
    });
  });
});
