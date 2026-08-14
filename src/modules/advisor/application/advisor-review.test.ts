import { describe, expect, it, vi } from "vitest";

import { AdvisorReviewService, AdvisorOperationError } from "@/modules/advisor/application/advisor-review";

const advisor = { id: "adv-1", role: "ADVISOR" as const };
const programEndsAt = new Date("2026-12-31T00:00:00Z");

function repository(overrides = {}) {
  return {
    findAssignment: vi.fn().mockResolvedValue({
      teamId: "team-1",
      programEndsAt,
      rubric: { id: "rubric-1", criteria: [{ id: "c1", maxPoints: 30 }, { id: "c2", maxPoints: 70 }] },
    }),
    saveScores: vi.fn().mockResolvedValue(true),
    addFeedback: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("AdvisorReviewService", () => {
  it("배점 초과 점수는 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.saveScores(advisor, { topicId: "t", scores: [{ criterionId: "c1", points: 31 }] }, new Date("2026-08-14")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("프로그램 종료 후 쓰기는 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.saveScores(advisor, { topicId: "t", scores: [{ criterionId: "c1", points: 10 }] }, new Date("2027-01-01")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("비할당 프로젝트는 거부한다", async () => {
    const service = new AdvisorReviewService(repository({ findAssignment: vi.fn().mockResolvedValue(null) }));
    await expect(service.addFeedback(advisor, { topicId: "t", body: "좋아요" }, new Date("2026-08-14")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("정상 점수는 팀·채점표와 함께 저장한다", async () => {
    const repo = repository();
    await new AdvisorReviewService(repo).saveScores(
      advisor,
      { topicId: "t", scores: [{ criterionId: "c1", points: 30 }, { criterionId: "c2", points: 0 }] },
      new Date("2026-08-14"),
    );
    expect(repo.saveScores).toHaveBeenCalledWith({
      teamId: "team-1",
      advisorId: "adv-1",
      rubricId: "rubric-1",
      scores: [{ criterionId: "c1", points: 30 }, { criterionId: "c2", points: 0 }],
    });
  });

  it("자문위원이 아닌 actor는 거부한다", async () => {
    const repo = repository();
    await expect(new AdvisorReviewService(repo).saveScores({ id: "u-1", role: "STUDENT" }, { topicId: "t", scores: [] }, new Date("2026-08-14")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.findAssignment).not.toHaveBeenCalled();
  });

  it("빈 피드백과 4000자 초과 피드백은 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.addFeedback(advisor, { topicId: "t", body: "   " }, new Date("2026-08-14")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    await expect(service.addFeedback(advisor, { topicId: "t", body: "가".repeat(4001) }, new Date("2026-08-14")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });
});
