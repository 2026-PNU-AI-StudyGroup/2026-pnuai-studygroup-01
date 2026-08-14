import type { PrismaClient } from "@/generated/prisma/client";
import type { AdvisorAssignmentContext, AdvisorReviewRepository } from "@/modules/advisor/application/advisor-review";

// 팀에 이미 배정된 채점표(TeamRubricEvaluation)를 그대로 사용한다.
// 분과별(CUSTOM)/공통(INHERIT_COMMON) 선택은 배정 시점에 끝나 있으므로 여기서 다시 계산하지 않는다.
export async function findTeamRubric(client: PrismaClient, teamId: string) {
  const assigned = await client.teamRubricEvaluation.findFirst({
    where: { teamId, rubric: { archivedAt: null, legacy: false } },
    orderBy: [{ rubric: { position: "asc" } }, { createdAt: "asc" }],
    select: {
      rubric: {
        select: {
          id: true,
          criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } },
        },
      },
    },
  });
  return assigned?.rubric ?? null;
}

export class PrismaAdvisorReviewRepository implements AdvisorReviewRepository {
  constructor(private readonly client: PrismaClient) {}

  async findAssignment(advisorId: string, topicId: string): Promise<AdvisorAssignmentContext | null> {
    const assignment = await this.client.projectAdvisor.findUnique({
      where: { topicId_userId: { topicId, userId: advisorId } },
      select: { topic: { select: { program: { select: { endsAt: true } }, team: { select: { id: true } } } } },
    });
    const topic = assignment?.topic;
    if (!topic?.team) return null;
    return {
      teamId: topic.team.id,
      programEndsAt: topic.program.endsAt,
      rubric: await findTeamRubric(this.client, topic.team.id),
    };
  }

  async saveScores(input: { teamId: string; advisorId: string; rubricId: string; scores: Array<{ criterionId: string; points: number }> }) {
    await this.client.$transaction(async (transaction) => {
      const evaluation = await transaction.advisorEvaluation.upsert({
        where: { teamId_advisorId_rubricId: { teamId: input.teamId, advisorId: input.advisorId, rubricId: input.rubricId } },
        create: { teamId: input.teamId, advisorId: input.advisorId, rubricId: input.rubricId },
        update: {},
        select: { id: true },
      });
      for (const score of input.scores) {
        await transaction.advisorScore.upsert({
          where: { evaluationId_criterionId: { evaluationId: evaluation.id, criterionId: score.criterionId } },
          create: { evaluationId: evaluation.id, criterionId: score.criterionId, points: score.points },
          update: { points: score.points },
        });
      }
    });
    return true;
  }

  async addFeedback(input: { teamId: string; advisorId: string; body: string; createdAt: Date }) {
    await this.client.advisorFeedback.create({ data: input });
    return true;
  }
}
