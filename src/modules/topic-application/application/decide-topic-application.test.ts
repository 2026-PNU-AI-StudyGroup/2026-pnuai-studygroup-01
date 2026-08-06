import { describe, expect, it, vi } from "vitest";

import {
  DecideTopicApplicationService,
  TopicApplicationDecisionConflictError,
  TopicApplicationDecisionForbiddenError,
} from "@/modules/topic-application/application/decide-topic-application";
import type { TopicApplicationDecisionRepository } from "@/modules/topic-application/application/topic-application-ports";

function repository(): TopicApplicationDecisionRepository {
  return {
    findDecisionState: vi.fn(async () => ({
      id: "application-1",
      status: "PENDING" as const,
      topicManagerId: "professor-1",
      topicAssistantIds: [],
    })),
    accept: vi.fn(async () => "ACCEPTED" as const),
    reject: vi.fn(async () => "REJECTED" as const),
  };
}

describe("주제 지원 결정", () => {
  it("주제 작성자가 지원을 수락한다", async () => {
    const applications = repository();
    const decidedAt = new Date("2026-03-05T00:00:00Z");
    const service = new DecideTopicApplicationService(
      applications,
      () => decidedAt,
    );

    await service.accept(
      { id: "professor-1", role: "PROFESSOR" },
      "application-1",
      "  선정 근거  ",
    );

    expect(applications.accept).toHaveBeenCalledWith(
      "application-1",
      { id: "professor-1", isAdmin: false },
      decidedAt,
      "선정 근거",
    );
  });

  it("미선정할 때 학생에게 전달할 검토 의견을 요구한다", async () => {
    const applications = repository();
    const service = new DecideTopicApplicationService(applications);

    await expect(
      service.reject(
        { id: "professor-1", role: "PROFESSOR" },
        "application-1",
        "   ",
      ),
    ).rejects.toThrow("미선정 사유를 검토 의견에 입력해 주세요.");
    expect(applications.reject).not.toHaveBeenCalled();
  });

  it("다른 교수의 결정을 거절한다", async () => {
    const applications = repository();
    const service = new DecideTopicApplicationService(applications);

    await expect(
      service.accept(
        { id: "professor-2", role: "PROFESSOR" },
        "application-1",
      ),
    ).rejects.toBeInstanceOf(TopicApplicationDecisionForbiddenError);
    expect(applications.accept).not.toHaveBeenCalled();
  });

  it("정원이 찬 수락 결과를 명시적인 충돌로 변환한다", async () => {
    const applications = repository();
    vi.mocked(applications.accept).mockResolvedValue("CAPACITY_REACHED");
    const service = new DecideTopicApplicationService(applications);

    await expect(
      service.accept(
        { id: "professor-1", role: "PROFESSOR" },
        "application-1",
      ),
    ).rejects.toBeInstanceOf(TopicApplicationDecisionConflictError);
  });
});
