export type RubricAudienceValue = "STAFF_ONLY" | "TEAM_MEMBERS";

export function isEvaluationComplete(criterionIds: string[], scoredCriterionIds: string[]) {
  if (criterionIds.length === 0) return false;
  const scored = new Set(scoredCriterionIds);
  return criterionIds.every((criterionId) => scored.has(criterionId));
}

export function canTeamMemberViewEvaluation(input: {
  audience: RubricAudienceValue;
  gradingDueAt: Date;
  criterionIds: string[];
  scoredCriterionIds: string[];
  legacy?: boolean;
  legacyMemberVisible?: boolean | null;
}, now: Date) {
  if (input.legacy) return input.legacyMemberVisible === true;
  return input.audience === "TEAM_MEMBERS"
    && isEvaluationComplete(input.criterionIds, input.scoredCriterionIds)
    && now >= input.gradingDueAt;
}
