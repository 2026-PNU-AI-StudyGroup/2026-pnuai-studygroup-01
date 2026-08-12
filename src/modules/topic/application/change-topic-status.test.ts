import { describe, expect, it, vi } from "vitest";

import {
  ChangeTopicStatusService,
  InvalidTopicStatusTransitionError,
  TopicManagementForbiddenError,
} from "@/modules/topic/application/change-topic-status";
import type { TopicStateRepository } from "@/modules/topic/application/topic-ports";

function repository(status: "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "CLOSED" = "PUBLISHED") {
  const value = {
    id: "topic-1",
    authorId: "professor-1",
    managerId: "professor-1",
    assistantIds: [] as string[],
    status,
    recruitmentEnabled: true,
  };
  return {
    findState: vi.fn(async () => value),
    closePublished: vi.fn(async () => true),
    closeRecruitment: vi.fn(async () => true),
  } satisfies TopicStateRepository;
}

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

  it("담당 교수가 프로젝트를 종료하지 않고 모집만 수동 마감한다", async () => {
    const topics = repository("PUBLISHED");
    const now = new Date("2026-03-01T00:00:00Z");

    await new ChangeTopicStatusService(topics, () => now).closeRecruitment(
      { id: "professor-1", role: "PROFESSOR" },
      "topic-1",
    );

    expect(topics.closeRecruitment).toHaveBeenCalledWith(
      "topic-1",
      { id: "professor-1", role: "PROFESSOR" },
      now,
    );
  });
});
