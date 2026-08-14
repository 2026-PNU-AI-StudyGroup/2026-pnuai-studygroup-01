import type { CurrentActor } from "@/modules/identity/domain/current-actor";

import { AdvisorOperationError } from "@/modules/advisor/application/manage-advisors";

export { AdvisorOperationError };

export const ADVISOR_FEEDBACK_MAX_LENGTH = 4000;

export type AdvisorAssignmentContext = {
  teamId: string;
  programEndsAt: Date;
  rubric: { id: string; criteria: Array<{ id: string; maxPoints: number }> } | null;
};

export interface AdvisorReviewRepository {
  findAssignment(advisorId: string, topicId: string): Promise<AdvisorAssignmentContext | null>;
  saveScores(input: { teamId: string; advisorId: string; rubricId: string; scores: Array<{ criterionId: string; points: number }> }): Promise<boolean>;
  addFeedback(input: { teamId: string; advisorId: string; body: string; createdAt: Date }): Promise<boolean>;
}

export class AdvisorReviewService {
  constructor(private readonly repository: AdvisorReviewRepository) {}

  private async assertWritable(actor: CurrentActor, topicId: string, now: Date) {
    if (actor.role !== "ADVISOR") throw new AdvisorOperationError("자문위원만 사용할 수 있습니다.");
    const assignment = await this.repository.findAssignment(actor.id, topicId);
    if (!assignment) throw new AdvisorOperationError("할당된 프로젝트가 아닙니다.");
    if (now > assignment.programEndsAt) throw new AdvisorOperationError("프로그램이 종료되어 더 이상 작성할 수 없습니다.");
    return assignment;
  }

  async saveScores(actor: CurrentActor, input: { topicId: string; scores: Array<{ criterionId: string; points: number }> }, now = new Date()) {
    const assignment = await this.assertWritable(actor, input.topicId, now);
    if (!assignment.rubric) throw new AdvisorOperationError("채점표가 준비되지 않았습니다.");
    const maxByCriterion = new Map(assignment.rubric.criteria.map((criterion) => [criterion.id, criterion.maxPoints]));
    for (const score of input.scores) {
      const max = maxByCriterion.get(score.criterionId);
      if (max === undefined || !Number.isSafeInteger(score.points) || score.points < 0 || score.points > max) {
        throw new AdvisorOperationError("점수는 0부터 항목 배점까지만 입력할 수 있습니다.");
      }
    }
    const saved = await this.repository.saveScores({
      teamId: assignment.teamId,
      advisorId: actor.id,
      rubricId: assignment.rubric.id,
      scores: input.scores,
    });
    if (!saved) throw new AdvisorOperationError("점수를 저장하지 못했습니다.");
  }

  async addFeedback(actor: CurrentActor, input: { topicId: string; body: string }, now = new Date()) {
    const assignment = await this.assertWritable(actor, input.topicId, now);
    const body = input.body.trim();
    if (body.length < 1 || body.length > ADVISOR_FEEDBACK_MAX_LENGTH) throw new AdvisorOperationError("피드백 내용을 확인해 주세요.");
    const saved = await this.repository.addFeedback({ teamId: assignment.teamId, advisorId: actor.id, body, createdAt: now });
    if (!saved) throw new AdvisorOperationError("피드백을 저장하지 못했습니다.");
  }
}
