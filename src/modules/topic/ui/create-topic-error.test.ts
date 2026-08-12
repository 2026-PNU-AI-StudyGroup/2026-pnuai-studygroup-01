import { describe, expect, it } from "vitest";

import { InvalidTopicDetailsError } from "@/modules/topic/domain/topic-policy";
import { getCreateTopicErrorMessage } from "@/modules/topic/ui/create-topic-error";

describe("주제 생성 오류 표시", () => {
  it("프로젝트 내용 도메인 오류를 폼 메시지로 변환한다", () => {
    expect(
      getCreateTopicErrorMessage(new InvalidTopicDetailsError("제목을 입력해 주세요.")),
    ).toContain("제목");
  });

  it("예상하지 못한 오류는 숨기지 않는다", () => {
    expect(getCreateTopicErrorMessage(new Error("database unavailable"))).toBeNull();
  });
});
