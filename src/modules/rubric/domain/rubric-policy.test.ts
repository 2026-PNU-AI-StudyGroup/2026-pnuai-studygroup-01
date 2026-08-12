import { describe, expect, it } from "vitest";

import { canTeamMemberViewEvaluation, isEvaluationComplete } from "@/modules/rubric/domain/rubric-policy";

const dueAt = new Date("2026-08-11T09:00:00Z");
const complete = { criterionIds: ["a", "b"], scoredCriterionIds: ["a", "b"] };

describe("채점표 공개 정책", () => {
  it("모든 현재 항목이 채점된 경우에만 완료로 본다", () => {
    expect(isEvaluationComplete(["a", "b"], ["a", "b"])).toBe(true);
    expect(isEvaluationComplete(["a", "b"], ["a"])).toBe(false);
    expect(isEvaluationComplete([], [])).toBe(false);
  });

  it("팀원 공개 대상이 완성되고 마감된 순간부터만 공개한다", () => {
    expect(canTeamMemberViewEvaluation({ audience: "TEAM_MEMBERS", gradingDueAt: dueAt, ...complete }, dueAt)).toBe(true);
    expect(canTeamMemberViewEvaluation({ audience: "TEAM_MEMBERS", gradingDueAt: dueAt, ...complete }, new Date(dueAt.getTime() - 1))).toBe(false);
    expect(canTeamMemberViewEvaluation({ audience: "STAFF_ONLY", gradingDueAt: dueAt, ...complete }, new Date(dueAt.getTime() + 1))).toBe(false);
    expect(canTeamMemberViewEvaluation({ audience: "TEAM_MEMBERS", gradingDueAt: dueAt, criterionIds: ["a", "b"], scoredCriterionIds: ["a"] }, new Date(dueAt.getTime() + 1))).toBe(false);
  });

  it("기존 평가의 공개 여부는 이관된 공개 스냅샷을 그대로 사용한다", () => {
    expect(canTeamMemberViewEvaluation({ audience: "STAFF_ONLY", gradingDueAt: dueAt, ...complete, legacy: true, legacyMemberVisible: true }, new Date(0))).toBe(true);
    expect(canTeamMemberViewEvaluation({ audience: "TEAM_MEMBERS", gradingDueAt: dueAt, ...complete, legacy: true, legacyMemberVisible: false }, new Date(dueAt.getTime() + 1))).toBe(false);
  });
});
