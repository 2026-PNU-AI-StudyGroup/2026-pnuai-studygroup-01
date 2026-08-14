import { describe, expect, it, vi } from "vitest";

import { AdvisorReviewService, AdvisorOperationError } from "@/modules/advisor/application/advisor-review";

const advisor = { id: "adv-1", role: "ADVISOR" as const };
const programEndsAt = new Date("2026-12-31T00:00:00Z");
const gradingDueAt = new Date("2026-09-30T00:00:00Z");
const now = new Date("2026-08-14T00:00:00Z");
const full = [{ criterionId: "c1", points: 10 }, { criterionId: "c2", points: 20 }];

function repository(overrides = {}) {
  return {
    findAssignment: vi.fn().mockResolvedValue({
      teamId: "team-1",
      programEndsAt,
      rubrics: [
        { id: "rubric-1", gradingDueAt, criteria: [{ id: "c1", maxPoints: 30 }, { id: "c2", maxPoints: 70 }] },
        { id: "rubric-2", gradingDueAt: new Date("2026-08-01T00:00:00Z"), criteria: [{ id: "d1", maxPoints: 50 }] },
      ],
    }),
    saveScores: vi.fn().mockResolvedValue(true),
    addFeedback: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function scoreInput(scores = full, rubricId = "rubric-1") {
  return { topicId: "t", rubricId, scores };
}

describe("AdvisorReviewService", () => {
  it("배점 초과 점수는 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.saveScores(advisor, scoreInput([{ criterionId: "c1", points: 31 }, { criterionId: "c2", points: 0 }]), now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("채점표 마감 후 채점은 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.saveScores(advisor, scoreInput(), new Date("2026-10-01T00:00:00Z")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("채점표 마감 시각 정각까지는 채점할 수 있다", async () => {
    const repo = repository();
    await new AdvisorReviewService(repo).saveScores(advisor, scoreInput(), gradingDueAt);
    expect(repo.saveScores).toHaveBeenCalledTimes(1);
  });

  it("채점표마다 마감이 따로 적용된다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.saveScores(advisor, scoreInput([{ criterionId: "d1", points: 10 }], "rubric-2"), now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("비할당 프로젝트는 거부한다", async () => {
    const service = new AdvisorReviewService(repository({ findAssignment: vi.fn().mockResolvedValue(null) }));
    await expect(service.addFeedback(advisor, { topicId: "t", body: "좋아요" }, now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("프로그램 종료 후 피드백은 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.addFeedback(advisor, { topicId: "t", body: "좋아요" }, new Date("2027-01-01T00:00:00Z")))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("정상 점수는 팀·채점표와 함께 저장한다", async () => {
    const repo = repository();
    await new AdvisorReviewService(repo).saveScores(advisor, scoreInput(), now);
    expect(repo.saveScores).toHaveBeenCalledWith({
      teamId: "team-1",
      advisorId: "adv-1",
      rubricId: "rubric-1",
      scores: full,
    });
  });

  it("자문위원이 아닌 actor는 거부한다", async () => {
    const repo = repository();
    await expect(new AdvisorReviewService(repo).saveScores({ id: "u-1", role: "STUDENT" }, scoreInput(), now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.findAssignment).not.toHaveBeenCalled();
  });

  it("배정되지 않은 채점표는 거부한다", async () => {
    const repo = repository();
    await expect(new AdvisorReviewService(repo).saveScores(advisor, scoreInput(full, "rubric-x"), now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.saveScores).not.toHaveBeenCalled();
  });

  it("알 수 없는 채점 항목은 거부한다", async () => {
    const repo = repository();
    await expect(new AdvisorReviewService(repo).saveScores(advisor, scoreInput([{ criterionId: "c1", points: 10 }, { criterionId: "d1", points: 10 }]), now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.saveScores).not.toHaveBeenCalled();
  });

  it("일부 항목만 제출하면 거부한다", async () => {
    const repo = repository();
    await expect(new AdvisorReviewService(repo).saveScores(advisor, scoreInput([{ criterionId: "c1", points: 10 }]), now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.saveScores).not.toHaveBeenCalled();
  });

  it("채점표가 없으면 거부한다", async () => {
    const repo = repository({ findAssignment: vi.fn().mockResolvedValue({ teamId: "team-1", programEndsAt, rubrics: [] }) });
    await expect(new AdvisorReviewService(repo).saveScores(advisor, scoreInput(), now))
      .rejects.toThrow("채점표가 준비되지 않았습니다.");
  });

  it("빈 피드백과 4000자 초과 피드백은 거부한다", async () => {
    const service = new AdvisorReviewService(repository());
    await expect(service.addFeedback(advisor, { topicId: "t", body: "   " }, now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    await expect(service.addFeedback(advisor, { topicId: "t", body: "가".repeat(4001) }, now))
      .rejects.toBeInstanceOf(AdvisorOperationError);
  });

  it("저장에 실패하면 에러를 던진다", async () => {
    const scoreService = new AdvisorReviewService(repository({ saveScores: vi.fn().mockResolvedValue(false) }));
    await expect(scoreService.saveScores(advisor, scoreInput(), now)).rejects.toBeInstanceOf(AdvisorOperationError);
    const feedbackService = new AdvisorReviewService(repository({ addFeedback: vi.fn().mockResolvedValue(false) }));
    await expect(feedbackService.addFeedback(advisor, { topicId: "t", body: "좋아요" }, now)).rejects.toBeInstanceOf(AdvisorOperationError);
  });
});
