import { describe, expect, it, vi } from "vitest";

import {
  ApplyToTopicService,
  TopicAlreadyAppliedError,
} from "@/modules/topic-application/application/apply-to-topic";
import type { TopicApplicationCreator } from "@/modules/topic-application/application/topic-application-ports";
import { TopicApplicationForbiddenError } from "@/modules/topic-application/domain/topic-application-policy";

describe("주제 지원", () => {
  it("학생의 지원 메시지를 정규화해 저장한다", async () => {
    const repository: TopicApplicationCreator = {
      createIfAvailable: vi.fn(async () => ({ outcome: "CREATED" as const, id: "app-1" })),
    };
    const appliedAt = new Date("2026-03-05T00:00:00Z");
    const service = new ApplyToTopicService(repository, () => appliedAt);

    await expect(
      service.execute(
        { id: "student-1", role: "STUDENT" },
        { topicId: "topic-1", message: "  참여하고 싶습니다.  " },
      ),
    ).resolves.toEqual({ id: "app-1" });
    expect(repository.createIfAvailable).toHaveBeenCalledWith({
      topicId: "topic-1",
      studentId: "student-1",
      message: "참여하고 싶습니다.",
      appliedAt,
    });
  });

  it("교수의 지원 요청을 저장소 호출 전에 거절한다", async () => {
    const repository: TopicApplicationCreator = { createIfAvailable: vi.fn() };
    const service = new ApplyToTopicService(repository);

    await expect(
      service.execute(
        { id: "professor-1", role: "PROFESSOR" },
        { topicId: "topic-1", message: "지원" },
      ),
    ).rejects.toBeInstanceOf(TopicApplicationForbiddenError);
    expect(repository.createIfAvailable).not.toHaveBeenCalled();
  });

  it("중복 지원 결과를 명시적인 오류로 변환한다", async () => {
    const repository: TopicApplicationCreator = {
      createIfAvailable: vi.fn(async () => ({ outcome: "ALREADY_APPLIED" as const })),
    };
    const service = new ApplyToTopicService(repository);

    await expect(
      service.execute(
        { id: "student-1", role: "STUDENT" },
        { topicId: "topic-1", message: "지원" },
      ),
    ).rejects.toBeInstanceOf(TopicAlreadyAppliedError);
  });
});
