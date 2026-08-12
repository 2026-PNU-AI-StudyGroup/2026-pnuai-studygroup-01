import { describe, expect, it } from "vitest";

import { createTopicInputSchema } from "@/modules/topic/ui/create-topic-input";

const input = {
  programId: "7f69845e-d4d2-4c20-b6d7-13e77d1029f3",
  divisionId: null,
  title: "주제",
  description: "설명",
  requiredSkills: "TypeScript, Python",
  preferredSkills: "Docker",
  roleExpectations: "프론트엔드 구현",
  availabilityRequirement: "수요일 회의 참여",
  applicationMode: "INDIVIDUAL_OR_TEAM",
  applicationQuestions: [{ label: "참여 동기", maxLength: "500", required: true }],
  capacity: "4",
};

describe("주제 폼 입력", () => {
  it("프로그램 공통 일정은 프로젝트 생성 입력으로 받지 않는다", () => {
    const parsed = createTopicInputSchema.parse(input);

    expect(parsed).not.toHaveProperty("recruitmentStartsAt");
    expect(parsed).not.toHaveProperty("executionStartsAt");
    expect(parsed).not.toHaveProperty("submissionStartsAt");
    expect(createTopicInputSchema.safeParse({
      ...input,
      recruitmentStartsAt: "2026-03-01T09:00",
    }).success).toBe(false);
  });
});
