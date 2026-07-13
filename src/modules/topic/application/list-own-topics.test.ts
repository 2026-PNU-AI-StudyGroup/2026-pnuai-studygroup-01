import { describe, expect, it, vi } from "vitest";

import {
  ListOwnTopicsService,
  TopicListingForbiddenError,
} from "@/modules/topic/application/list-own-topics";
import type { TopicLister } from "@/modules/topic/application/topic-ports";

describe("내 주제 조회", () => {
  it("현재 교수의 식별자로만 조회한다", async () => {
    const repository: TopicLister = { listByAuthor: vi.fn(async () => []) };
    const service = new ListOwnTopicsService(repository);

    await service.execute({ id: "professor-1", role: "PROFESSOR" });

    expect(repository.listByAuthor).toHaveBeenCalledWith("professor-1");
  });

  it("학생의 조회를 저장소 호출 전에 거절한다", async () => {
    const repository: TopicLister = { listByAuthor: vi.fn(async () => []) };
    const service = new ListOwnTopicsService(repository);

    await expect(
      service.execute({ id: "student-1", role: "STUDENT" }),
    ).rejects.toBeInstanceOf(TopicListingForbiddenError);
    expect(repository.listByAuthor).not.toHaveBeenCalled();
  });
});
