import { describe, expect, it, vi } from "vitest";

import {
  ChangeTopicStatusService,
} from "@/modules/topic/application/change-topic-status";
import type { TopicStateRepository } from "@/modules/topic/application/topic-ports";

function repository(status: "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" = "ACTIVE") {
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
    closeRecruitment: vi.fn(async () => true),
  } satisfies TopicStateRepository;
}

describe("주제 모집 마감", () => {
  it("담당 교수가 프로젝트를 종료하지 않고 모집만 수동 마감한다", async () => {
    const topics = repository("ACTIVE");
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
