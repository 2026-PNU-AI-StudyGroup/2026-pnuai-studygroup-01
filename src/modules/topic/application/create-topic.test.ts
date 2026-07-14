import { describe, expect, it, vi } from "vitest";

import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import {
  ProjectProgramNotOpenError,
  CreateTopicService,
  TopicCreationForbiddenError,
} from "@/modules/topic/application/create-topic";
import type { TopicCreator } from "@/modules/topic/application/topic-ports";

const topicInput = {
  programId: "program-1",
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

function repositories(programExists = true) {
  const topics: TopicCreator = {
    createDraft: vi.fn(async () => ({ id: "topic-1" })),
  };
  const programs: Pick<ProjectProgramRepository, "findOpen"> = {
    findOpen: vi.fn(async () => programExists ? {
      id: "program-1",
      academicCycleId: "cycle-1",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-12-31T00:00:00Z"),
    } : null),
  };
  return { topics, programs };
}

describe("주제 초안 생성", () => {
  it("교수가 기간이 겹치는 주제 초안을 생성한다", async () => {
    const { topics, programs } = repositories();
    const service = new CreateTopicService(topics, programs);

    await expect(
      service.execute({ id: "professor-1", role: "PROFESSOR" }, topicInput),
    ).resolves.toEqual({ id: "topic-1" });
    expect(topics.createDraft).toHaveBeenCalledWith({
      ...topicInput,
      academicCycleId: "cycle-1",
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
    const { topics, programs } = repositories();
    const service = new CreateTopicService(topics, programs);

    await expect(
      service.execute({ id: "student-1", role: "STUDENT" }, topicInput),
    ).rejects.toBeInstanceOf(TopicCreationForbiddenError);
    expect(programs.findOpen).not.toHaveBeenCalled();
    expect(topics.createDraft).not.toHaveBeenCalled();
  });

  it("공개되지 않은 프로그램의 주제를 거절한다", async () => {
    const { topics, programs } = repositories(false);
    const service = new CreateTopicService(topics, programs);

    await expect(
      service.execute({ id: "professor-1", role: "PROFESSOR" }, topicInput),
    ).rejects.toBeInstanceOf(ProjectProgramNotOpenError);
    expect(topics.createDraft).not.toHaveBeenCalled();
  });
});
