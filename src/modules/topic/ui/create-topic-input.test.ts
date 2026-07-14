import { describe, expect, it } from "vitest";

import { createTopicInputSchema } from "@/modules/topic/ui/create-topic-input";

const input = {
  academicCycleId: "7f69845e-d4d2-4c20-b6d7-13e77d1029f3",
  title: "주제",
  description: "설명",
  requiredSkills: "TypeScript, Python",
  preferredSkills: "Docker",
  roleExpectations: "프론트엔드 구현",
  availabilityRequirement: "수요일 회의 참여",
  capacity: "4",
  recruitmentStartsAt: "2026-03-01T09:00",
  recruitmentEndsAt: "2026-03-10T09:00",
  executionStartsAt: "2026-03-05T09:00",
  executionEndsAt: "2026-06-10T09:00",
  submissionStartsAt: "2026-06-01T09:00",
  submissionEndsAt: "2026-06-20T09:00",
};

describe("주제 폼 입력", () => {
  it("한국 시각을 서버 시간대와 무관한 UTC 시각으로 변환한다", () => {
    const parsed = createTopicInputSchema.parse(input);

    expect(parsed.recruitmentStartsAt.toISOString()).toBe(
      "2026-03-01T00:00:00.000Z",
    );
  });

  it("시간대 없는 날짜·시각 형식만 허용한다", () => {
    expect(
      createTopicInputSchema.safeParse({
        ...input,
        recruitmentStartsAt: "2026-03-01T09:00:00Z",
      }).success,
    ).toBe(false);
  });

  it.each(["2026-02-29T09:00", "2026-04-31T09:00", "2026-13-01T09:00"])(
    "실제 달력에 없는 시각 %s를 거절한다",
    (recruitmentStartsAt) => {
      expect(
        createTopicInputSchema.safeParse({ ...input, recruitmentStartsAt })
          .success,
      ).toBe(false);
    },
  );
});
