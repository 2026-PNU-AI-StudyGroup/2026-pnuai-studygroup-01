import { describe, expect, it } from "vitest";

import { createTopicInputSchema, parseTopicFormData } from "@/modules/topic/ui/create-topic-input";

const input = {
  programId: "7f69845e-d4d2-4c20-b6d7-13e77d1029f3",
  divisionId: null,
  title: "주제",
  description: "설명",
  requiredSkills: "TypeScript, Python",
  preferredSkills: "Docker",
  roleExpectations: "프론트엔드 구현",
  availabilityRequirement: "수요일 회의 참여",
  recruitmentEnabled: "false",
  applicationMode: "INDIVIDUAL_OR_TEAM",
  applicationQuestions: [{ label: "참여 동기", maxLength: "500", required: true }],
  capacity: "4",
};

describe("주제 폼 입력", () => {
  it("학생 지원 여부를 명시적인 불리언으로 변환한다", () => {
    expect(createTopicInputSchema.parse(input).recruitmentEnabled).toBe(false);
    expect(createTopicInputSchema.parse({ ...input, recruitmentEnabled: "true" }).recruitmentEnabled).toBe(true);
  });

  it("지원을 받지 않으면 지원 관련 입력을 요구하지 않고 안전한 빈 값으로 정규화한다", () => {
    const formData = new FormData();
    formData.set("programId", input.programId);
    formData.set("title", input.title);
    formData.set("description", input.description);
    formData.set("recruitmentEnabled", "false");

    const parsed = parseTopicFormData(formData);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toMatchObject({
      recruitmentEnabled: false,
      requiredSkills: [],
      preferredSkills: [],
      roleExpectations: "",
      availabilityRequirement: "",
      applicationMode: "INDIVIDUAL_ONLY",
      applicationQuestions: [],
      capacity: 1,
    });
  });

  it("지원을 받으면 지원 조건과 문항을 계속 필수로 검사한다", () => {
    expect(createTopicInputSchema.safeParse({
      ...input,
      recruitmentEnabled: "true",
      requiredSkills: "",
      roleExpectations: "",
      availabilityRequirement: "",
      applicationQuestions: [],
    }).success).toBe(false);
  });

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
