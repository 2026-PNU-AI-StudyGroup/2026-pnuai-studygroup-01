import { describe, expect, it, vi } from "vitest";

import type { AcademicCycleReader } from "@/modules/academic-cycle/application/academic-cycle-ports";
import {
  AcademicCycleNotFoundError,
  CreateTopicService,
  TopicCreationForbiddenError,
} from "@/modules/topic/application/create-topic";
import type { TopicCreator } from "@/modules/topic/application/topic-ports";

const topicInput = {
  academicCycleId: "cycle-1",
  title: "  로컬 번역  ",
  description: "  졸업과제 번역  ",
  requiredSkills: [" TypeScript "],
  preferredSkills: [" Docker "],
  roleExpectations: " 프론트엔드 구현 ",
  availabilityRequirement: " 수요일 회의 참여 ",
  capacity: 4,
  recruitmentStartsAt: new Date("2026-03-01T00:00:00Z"),
  recruitmentEndsAt: new Date("2026-03-10T00:00:00Z"),
  executionStartsAt: new Date("2026-03-05T00:00:00Z"),
  executionEndsAt: new Date("2026-06-10T00:00:00Z"),
  submissionStartsAt: new Date("2026-06-01T00:00:00Z"),
  submissionEndsAt: new Date("2026-06-20T00:00:00Z"),
};

function repositories(cycleExists = true) {
  const topics: TopicCreator = {
    createDraft: vi.fn(async () => ({ id: "topic-1" })),
  };
  const cycles: AcademicCycleReader = {
    exists: vi.fn(async () => cycleExists),
  };
  return { topics, cycles };
}

describe("주제 초안 생성", () => {
  it("교수가 기간이 겹치는 주제 초안을 생성한다", async () => {
    const { topics, cycles } = repositories();
    const service = new CreateTopicService(topics, cycles);

    await expect(
      service.execute({ id: "professor-1", role: "PROFESSOR" }, topicInput),
    ).resolves.toEqual({ id: "topic-1" });
    expect(topics.createDraft).toHaveBeenCalledWith({
      ...topicInput,
      title: "로컬 번역",
      description: "졸업과제 번역",
      requiredSkills: ["TypeScript"],
      preferredSkills: ["Docker"],
      roleExpectations: "프론트엔드 구현",
      availabilityRequirement: "수요일 회의 참여",
      authorId: "professor-1",
    });
  });

  it("학생의 생성 요청은 저장소 호출 전에 거절한다", async () => {
    const { topics, cycles } = repositories();
    const service = new CreateTopicService(topics, cycles);

    await expect(
      service.execute({ id: "student-1", role: "STUDENT" }, topicInput),
    ).rejects.toBeInstanceOf(TopicCreationForbiddenError);
    expect(cycles.exists).not.toHaveBeenCalled();
    expect(topics.createDraft).not.toHaveBeenCalled();
  });

  it("존재하지 않는 학기의 주제를 거절한다", async () => {
    const { topics, cycles } = repositories(false);
    const service = new CreateTopicService(topics, cycles);

    await expect(
      service.execute({ id: "professor-1", role: "PROFESSOR" }, topicInput),
    ).rejects.toBeInstanceOf(AcademicCycleNotFoundError);
    expect(topics.createDraft).not.toHaveBeenCalled();
  });
});
