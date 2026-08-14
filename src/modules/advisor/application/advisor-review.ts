import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { AdvisorOperationError } from "@/modules/advisor/application/manage-advisors";

export { AdvisorOperationError };

export const ADVISOR_FEEDBACK_MAX_LENGTH = 4000;

export type AdvisorAssignmentContext = {
  teamId: string;
  programEndsAt: Date;
  rubrics: Array<{ id: string; gradingDueAt: Date; criteria: Array<{ id: string; maxPoints: number }> }>;
};

export interface AdvisorReviewRepository {
  findAssignment(advisorId: string, topicId: string): Promise<AdvisorAssignmentContext | null>;
  saveScores(input: { teamId: string; advisorId: string; rubricId: string; scores: Array<{ criterionId: string; points: number }> }): Promise<boolean>;
  addFeedback(input: { teamId: string; advisorId: string; body: string; createdAt: Date }): Promise<boolean>;
}

export class AdvisorReviewService {
  constructor(private readonly repository: AdvisorReviewRepository) {}

  private async assignmentOf(actor: CurrentActor, topicId: string) {
    if (actor.role !== "ADVISOR") throw new AdvisorOperationError("자문위원만 사용할 수 있습니다.");
    const assignment = await this.repository.findAssignment(actor.id, topicId);
    if (!assignment) throw new AdvisorOperationError("할당된 프로젝트가 아닙니다.");
    return assignment;
  }

  // 채점 마감은 채점표별 gradingDueAt, 피드백 마감은 프로그램 종료일을 따른다.
  async saveScores(
    actor: CurrentActor,
    input: { topicId: string; rubricId: string; scores: Array<{ criterionId: string; points: number }> },
    now = new Date(),
  ) {
    const assignment = await this.assignmentOf(actor, input.topicId);
    if (assignment.rubrics.length === 0) throw new AdvisorOperationError("채점표가 준비되지 않았습니다.");
    const rubric = assignment.rubrics.find((candidate) => candidate.id === input.rubricId);
    if (!rubric) throw new AdvisorOperationError("채점표를 찾을 수 없습니다.");
    if (now > rubric.gradingDueAt) throw new AdvisorOperationError("채점 기간이 종료되었습니다.");

    const maxByCriterion = new Map(rubric.criteria.map((criterion) => [criterion.id, criterion.maxPoints]));
    const submitted = new Set<string>();
    for (const score of input.scores) {
      const max = maxByCriterion.get(score.criterionId);
      if (max === undefined) throw new AdvisorOperationError("채점 항목을 확인해 주세요.");
      if (!Number.isSafeInteger(score.points) || score.points < 0 || score.points > max) {
        throw new AdvisorOperationError("점수는 0부터 항목 배점까지만 입력할 수 있습니다.");
      }
      submitted.add(score.criterionId);
    }
    if (submitted.size !== rubric.criteria.length) throw new AdvisorOperationError("모든 항목의 점수를 입력해 주세요.");

    const saved = await this.repository.saveScores({
      teamId: assignment.teamId,
      advisorId: actor.id,
      rubricId: rubric.id,
      scores: input.scores,
    });
    if (!saved) throw new AdvisorOperationError("점수를 저장하지 못했습니다.");
  }

  async addFeedback(actor: CurrentActor, input: { topicId: string; body: string }, now = new Date()) {
    const assignment = await this.assignmentOf(actor, input.topicId);
    if (now > assignment.programEndsAt) throw new AdvisorOperationError("프로그램이 종료되어 더 이상 작성할 수 없습니다.");
    const body = input.body.trim();
    if (body.length < 1 || body.length > ADVISOR_FEEDBACK_MAX_LENGTH) throw new AdvisorOperationError("피드백 내용을 확인해 주세요.");
    const saved = await this.repository.addFeedback({ teamId: assignment.teamId, advisorId: actor.id, body, createdAt: now });
    if (!saved) throw new AdvisorOperationError("피드백을 저장하지 못했습니다.");
  }
}
