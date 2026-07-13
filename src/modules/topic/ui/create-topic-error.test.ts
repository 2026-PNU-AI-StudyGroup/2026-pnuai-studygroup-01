import { describe, expect, it } from "vitest";

import { InvalidTopicScheduleError } from "@/modules/topic/domain/topic-policy";
import { getCreateTopicErrorMessage } from "@/modules/topic/ui/create-topic-error";

describe("주제 생성 오류 표시", () => {
  it("기간 도메인 오류를 폼 메시지로 변환한다", () => {
    expect(
      getCreateTopicErrorMessage(new InvalidTopicScheduleError("execution")),
    ).toContain("execution");
  });

  it("예상하지 못한 오류는 숨기지 않는다", () => {
    expect(getCreateTopicErrorMessage(new Error("database unavailable"))).toBeNull();
  });
});
