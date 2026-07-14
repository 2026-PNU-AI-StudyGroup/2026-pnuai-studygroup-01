import { describe, expect, it } from "vitest";

import {
  assertValidTopicDetails,
  assertValidTopicPublication,
  assertValidTopicSchedule,
  canCreateTopic,
  canManageTopic,
  InvalidTopicScheduleError,
  type TopicSchedule,
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
  ])("유효하지 않은 주제 내용 $title/$description/$capacity 을 거절한다", (details) => {
    expect(() => assertValidTopicDetails(details)).toThrow();
  });
});

function validSchedule(): TopicSchedule {
  return {
    recruitmentStartsAt: new Date("2026-03-01T00:00:00Z"),
    recruitmentEndsAt: new Date("2026-03-10T00:00:00Z"),
    executionStartsAt: new Date("2026-03-05T00:00:00Z"),
    executionEndsAt: new Date("2026-06-10T00:00:00Z"),
    submissionStartsAt: new Date("2026-06-01T00:00:00Z"),
    submissionEndsAt: new Date("2026-06-20T00:00:00Z"),
  };
}

describe("주제 기간 정책", () => {
  it("각 기간이 유효하면 기간끼리 겹쳐도 허용한다", () => {
    expect(() => assertValidTopicSchedule(validSchedule())).not.toThrow();
  });

  it.each(["recruitment", "execution", "submission"] as const)(
    "%s 시작 시각이 종료 시각과 같거나 늦으면 거절한다",
    (period) => {
      const schedule = validSchedule();
      const startsAtKey = `${period}StartsAt` as keyof TopicSchedule;
      const endsAtKey = `${period}EndsAt` as keyof TopicSchedule;
      schedule[startsAtKey] = schedule[endsAtKey];

      expect(() => assertValidTopicSchedule(schedule)).toThrow(
        InvalidTopicScheduleError,
      );
    },
  );

  it("해석할 수 없는 날짜를 거절한다", () => {
    const schedule = validSchedule();
    schedule.executionStartsAt = new Date("invalid");

    expect(() => assertValidTopicSchedule(schedule)).toThrow(
      InvalidTopicScheduleError,
    );
  });
});

describe("주제 공개 상태 정책", () => {
  it.each([
    { status: "DRAFT", publishedAt: null },
    { status: "PUBLISHED", publishedAt: new Date("2026-03-01T00:00:00Z") },
    { status: "CLOSED", publishedAt: new Date("2026-03-01T00:00:00Z") },
  ] as const)("$status 상태와 공개 시각의 일관성을 허용한다", (publication) => {
    expect(() => assertValidTopicPublication(publication)).not.toThrow();
  });

  it.each([
    { status: "DRAFT", publishedAt: new Date("2026-03-01T00:00:00Z") },
    { status: "PUBLISHED", publishedAt: null },
    { status: "CLOSED", publishedAt: null },
    { status: "PUBLISHED", publishedAt: new Date("invalid") },
    { status: "DRAFT", publishedAt: new Date("invalid") },
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

  it("작성자와 관리자는 주제를 관리할 수 있다", () => {
    expect(canManageTopic({ id: "author", role: "PROFESSOR" }, "author")).toBe(
      true,
    );
    expect(canManageTopic({ id: "other", role: "PROFESSOR" }, "author")).toBe(
      false,
    );
    expect(canManageTopic({ id: "author", role: "STUDENT" }, "author")).toBe(
      false,
    );
    expect(canManageTopic({ id: "admin", role: "ADMIN" }, "author")).toBe(true);
  });
});
