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
  applicationMode: "INDIVIDUAL_OR_TEAM" as const,
  applicationQuestions: [{ label: " 참여 동기 ", maxLength: 500, required: true }],
  capacity: 4,
  recruitmentStartsAt: new Date("2026-03-01T00:00:00Z"),
  executionStartsAt: new Date("2026-03-05T00:00:00Z"),
  executionEndsAt: new Date("2026-06-10T00:00:00Z"),
  submissionStartsAt: new Date("2026-06-01T00:00:00Z"),
  submissionEndsAt: new Date("2026-06-20T00:00:00Z"),
};

function repositories(programExists = true) {
  const topics: TopicCreator = {
    createPublished: vi.fn(async () => ({ id: "topic-1" })),
  };
  const programs: Pick<ProjectProgramRepository, "findById"> = {
    findById: vi.fn(async () => programExists ? {
      id: "program-1",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-12-31T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-03-10T00:00:00Z"),
      advisorEnabled: true,
      studentProjectCreationEnabled: false,
      isPublic: false,
      lifecycleStatus: "ACTIVE" as const,
      startYear: 2026,
      topicCount: 0,
      teamCount: 0,
      name: "프로그램",
      category: "교과",
      description: "설명",
      icon: "FOLDER" as const,
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
    expect(topics.createPublished).toHaveBeenCalledWith({
      ...topicInput,
      title: "로컬 번역",
      description: "졸업과제 번역",
      requiredSkills: ["TypeScript"],
      preferredSkills: ["Docker"],
      roleExpectations: "프론트엔드 구현",
      availabilityRequirement: "수요일 회의 참여",
      applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
      authorId: "professor-1",
    }, expect.any(Date));
  });

  it("학생의 생성 요청은 저장소 호출 전에 거절한다", async () => {
    const { topics, programs } = repositories();
    const service = new CreateTopicService(topics, programs);

    await expect(
      service.execute({ id: "student-1", role: "STUDENT" }, topicInput),
    ).rejects.toBeInstanceOf(TopicCreationForbiddenError);
    expect(programs.findById).not.toHaveBeenCalled();
    expect(topics.createPublished).not.toHaveBeenCalled();
  });

  it("공개되지 않은 프로그램의 주제를 거절한다", async () => {
    const { topics, programs } = repositories(false);
    const service = new CreateTopicService(topics, programs);

    await expect(
      service.execute({ id: "professor-1", role: "PROFESSOR" }, topicInput),
    ).rejects.toBeInstanceOf(ProjectProgramNotOpenError);
    expect(topics.createPublished).not.toHaveBeenCalled();
  });

  it("프로젝트 등록 기간 밖에서는 공개 프로그램이어도 초안을 만들지 않는다", async () => {
    const { topics, programs } = repositories();
    vi.mocked(programs.findById).mockResolvedValue({
      id: "program-1",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-12-31T00:00:00Z"),
      projectRegistrationStartsAt: new Date("2026-01-01T00:00:00Z"),
      projectRegistrationEndsAt: new Date("2026-02-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-03-10T00:00:00Z"),
      advisorEnabled: true,
      studentProjectCreationEnabled: false,
      isPublic: false,
      lifecycleStatus: "ACTIVE",
      startYear: 2026,
      topicCount: 0,
      teamCount: 0,
      name: "프로그램",
      category: "교과",
      description: "설명",
      icon: "FOLDER",
    });
    await expect(new CreateTopicService(topics, programs, () => new Date("2026-03-01T00:00:00Z")).execute(
      { id: "professor-1", role: "PROFESSOR" },
      topicInput,
    )).rejects.toBeInstanceOf(ProjectProgramNotOpenError);
    expect(topics.createPublished).not.toHaveBeenCalled();
  });
});
