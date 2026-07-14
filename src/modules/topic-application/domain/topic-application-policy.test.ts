import { describe, expect, it } from "vitest";

import {
  InvalidTopicApplicationMessageError,
  InvalidTopicApplicationProfileError,
  normalizeApplicationMessage,
  normalizeApplicationProfile,
} from "@/modules/topic-application/domain/topic-application-policy";

describe("지원 정보 정책", () => {
  it("잘못된 메시지와 프로필을 각각 맞는 오류로 구분한다", () => {
    expect(() => normalizeApplicationMessage(" ")).toThrow(InvalidTopicApplicationMessageError);
    expect(() => normalizeApplicationProfile({
      skills: [],
      desiredRole: "개발",
      availability: "주말",
    })).toThrow(InvalidTopicApplicationProfileError);
  });
});
