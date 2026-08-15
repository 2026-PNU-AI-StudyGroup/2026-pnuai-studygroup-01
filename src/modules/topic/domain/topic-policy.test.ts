import { describe, expect, it } from "vitest";

import {
  assertValidTopicDetails,
  assertValidTopicPublication,
  canCreateTopic,
  canManageTopic,
} from "@/modules/topic/domain/topic-policy";

describe("주제 내용 정책", () => {
  it("제목과 설명, 양의 정수 모집 인원을 허용한다", () => {
    expect(() =>
      assertValidTopicDetails({
        title: "로컬 LLM 기반 번역",
        description: "졸업과제 번역 시스템",
        requiredSkills: ["TypeScript"],
        preferredSkills: [],
        roleExpectations: "프론트엔드 구현",
        availabilityRequirement: "수요일 회의",
        applicationMode: "INDIVIDUAL_ONLY",
        applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
        capacity: 4,
      }),
    ).not.toThrow();
  });

  const valid = {
    title: "주제",
    description: "설명",
    requiredSkills: ["TypeScript"],
    preferredSkills: [] as string[],
    roleExpectations: "프론트엔드 구현",
    availabilityRequirement: "수요일 회의",
    applicationMode: "INDIVIDUAL_ONLY" as const,
    applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
    capacity: 1,
  };

  it.each([
    { ...valid, title: " " },
    { ...valid, description: " " },
    { ...valid, requiredSkills: [] },
    { ...valid, roleExpectations: " " },
    { ...valid, availabilityRequirement: " " },
    { ...valid, capacity: 0 },
    { ...valid, capacity: 1.5 },
    { ...valid, applicationQuestions: [] },
    { ...valid, applicationQuestions: [{ label: " ", maxLength: 500, required: true }] },
    { ...valid, applicationQuestions: [{ label: "참여 동기", maxLength: 5_001, required: true }] },
  ])("유효하지 않은 주제 내용 $title/$description/$capacity 을 거절한다", (details) => {
    expect(() => assertValidTopicDetails(details)).toThrow();
  });

  it("추가 모집이 없는 기존 팀 프로젝트를 위해 1인 팀 지원 정원을 허용한다", () => {
    expect(() => assertValidTopicDetails({ ...valid, applicationMode: "TEAM_ONLY", capacity: 1 })).not.toThrow();
  });

  it("학생 지원을 받지 않는 프로젝트는 지원 조건과 지원서 없이 등록할 수 있다", () => {
    expect(() => assertValidTopicDetails({
      ...valid,
      recruitmentEnabled: false,
      requiredSkills: [],
      roleExpectations: "",
      availabilityRequirement: "",
      applicationQuestions: [],
    })).not.toThrow();
  });
});

describe("주제 공개 상태 정책", () => {
  it.each([
    { status: "PENDING_APPROVAL", publishedAt: null },
    { status: "REJECTED", publishedAt: null },
    { status: "ACTIVE", publishedAt: new Date("2026-03-01T00:00:00Z") },
  ] as const)("$status 상태와 공개 시각의 일관성을 허용한다", (publication) => {
    expect(() => assertValidTopicPublication(publication)).not.toThrow();
  });

  it.each([
    { status: "PENDING_APPROVAL", publishedAt: new Date("2026-03-01T00:00:00Z") },
    { status: "ACTIVE", publishedAt: null },
    { status: "ACTIVE", publishedAt: new Date("invalid") },
    { status: "REJECTED", publishedAt: new Date("invalid") },
  ] as const)("$status 상태와 모순된 공개 시각을 거절한다", (publication) => {
    expect(() => assertValidTopicPublication(publication)).toThrow();
  });
});

describe("주제 소유권 정책", () => {
  it("교수와 관리자만 주제를 만들 수 있다", () => {
    expect(canCreateTopic({ id: "student", role: "STUDENT" })).toBe(false);
    expect(canCreateTopic({ id: "professor", role: "PROFESSOR" })).toBe(true);
    expect(canCreateTopic({ id: "admin", role: "ADMIN" })).toBe(true);
  });

  it("담당 교수와 관리자는 주제를 관리할 수 있다", () => {
    expect(canManageTopic({ id: "manager", role: "PROFESSOR" }, "manager")).toBe(
      true,
    );
    expect(canManageTopic({ id: "other", role: "PROFESSOR" }, "manager")).toBe(
      false,
    );
    expect(canManageTopic({ id: "manager", role: "STUDENT" }, "manager")).toBe(
      false,
    );
    expect(canManageTopic({ id: "admin", role: "ADMIN" }, null)).toBe(true);
  });
});
