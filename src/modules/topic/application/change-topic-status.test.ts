import { describe, expect, it, vi } from "vitest";

import {
  ChangeTopicStatusService,
  InvalidTopicStatusTransitionError,
  TopicManagementForbiddenError,
} from "@/modules/topic/application/change-topic-status";
import type { TopicStateRepository } from "@/modules/topic/application/topic-ports";

function repository(status: "DRAFT" | "PUBLISHED" | "CLOSED" = "DRAFT") {
  const value = {
    id: "topic-1",
    authorId: "professor-1",
    managerId: "professor-1",
    assistantIds: [] as string[],
    status,
    recruitmentEndsAt: new Date("2026-03-10T00:00:00Z"),
  };
  return {
    findState: vi.fn(async () => value),
    publishDraft: vi.fn(async () => true),
    closePublished: vi.fn(async () => true),
  } satisfies TopicStateRepository;
}

describe("주제 공개", () => {
  it("담당 교수의 초안을 공개 시각과 함께 공개한다", async () => {
    const topics = repository();
    const now = new Date("2026-03-01T00:00:00Z");
    const service = new ChangeTopicStatusService(topics, () => now);

    await service.publish({ id: "professor-1", role: "PROFESSOR" }, "topic-1");

    expect(topics.publishDraft).toHaveBeenCalledWith(
      "topic-1",
      { id: "professor-1", role: "PROFESSOR" },
      now,
    );
  });

  it("다른 교수의 공개 요청을 거절한다", async () => {
    const topics = repository();
    const service = new ChangeTopicStatusService(topics);

    await expect(
      service.publish({ id: "professor-2", role: "PROFESSOR" }, "topic-1"),
    ).rejects.toBeInstanceOf(TopicManagementForbiddenError);
    expect(topics.publishDraft).not.toHaveBeenCalled();
  });

  it("학생 계정인 프로젝트 조교도 초안을 공개할 수 있다", async () => {
    const topics = repository();
    vi.mocked(topics.findState).mockResolvedValue({
      id: "topic-1",
      authorId: "professor-1",
      managerId: "professor-1",
      assistantIds: ["student-assistant-1"],
      status: "DRAFT",
      recruitmentEndsAt: new Date("2026-03-10T00:00:00Z"),
    });
    const now = new Date("2026-03-01T00:00:00Z");

    await new ChangeTopicStatusService(topics, () => now).publish(
      { id: "student-assistant-1", role: "STUDENT" },
      "topic-1",
    );

    expect(topics.publishDraft).toHaveBeenCalledWith(
      "topic-1",
      { id: "student-assistant-1", role: "STUDENT" },
      now,
    );
  });

  it("모집 종료 시각이 지난 초안을 공개하지 않는다", async () => {
    const topics = repository();
    const service = new ChangeTopicStatusService(
      topics,
      () => new Date("2026-03-10T00:00:00Z"),
    );

    await expect(
      service.publish({ id: "professor-1", role: "PROFESSOR" }, "topic-1"),
    ).rejects.toBeInstanceOf(InvalidTopicStatusTransitionError);
    expect(topics.publishDraft).not.toHaveBeenCalled();
  });
});

describe("주제 마감", () => {
  it("담당 교수가 공개 주제를 마감한다", async () => {
    const topics = repository("PUBLISHED");
    const service = new ChangeTopicStatusService(topics);

    await service.close({ id: "professor-1", role: "PROFESSOR" }, "topic-1");

    expect(topics.closePublished).toHaveBeenCalledWith(
      "topic-1",
      { id: "professor-1", role: "PROFESSOR" },
    );
  });
});
