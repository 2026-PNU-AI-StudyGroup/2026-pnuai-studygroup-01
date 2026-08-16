import type { PrismaClient } from "@/generated/prisma/client";
import type { AdvisorAssignmentContext, AdvisorReviewRepository } from "@/modules/advisor/application/advisor-review";

// 프로젝트 팀에 이미 배정된 채점표(ProjectTeamRubricEvaluation)를 그대로 사용한다.
// 공통 채점표와 해당 분과 채점표는 팀 생성 시 함께 배정되므로 여기서 다시 계산하지 않는다.
export async function findTeamRubrics(client: PrismaClient, teamId: string) {
  const assigned = await client.projectTeamRubricEvaluation.findMany({
    where: { projectTeamId: teamId, rubric: { archivedAt: null, legacy: false } },
    orderBy: [{ rubric: { position: "asc" } }, { createdAt: "asc" }],
    select: {
      rubric: {
        select: {
          id: true,
          title: true,
          gradingDueAt: true,
          criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } },
        },
      },
    },
  });
  return assigned.map((evaluation) => evaluation.rubric);
}

export class PrismaAdvisorReviewRepository implements AdvisorReviewRepository {
  constructor(private readonly client: PrismaClient) {}

  async findAssignment(advisorId: string, topicId: string): Promise<AdvisorAssignmentContext | null> {
    const assignment = await this.client.projectAdvisor.findUnique({
      where: { topicId_userId: { topicId, userId: advisorId } },
      select: { topic: { select: { program: { select: { endsAt: true } }, projectTeam: { select: { id: true } } } } },
    });
    const topic = assignment?.topic;
    if (!topic?.projectTeam) return null;
    return {
      teamId: topic.projectTeam.id,
      programEndsAt: topic.program.endsAt,
      rubrics: await findTeamRubrics(this.client, topic.projectTeam.id),
    };
  }

  async saveScores(input: { teamId: string; advisorId: string; rubricId: string; scores: Array<{ criterionId: string; points: number }> }) {
    await this.client.$transaction(async (transaction) => {
      const evaluation = await transaction.advisorEvaluation.upsert({
        where: { projectTeamId_advisorId_rubricId: { projectTeamId: input.teamId, advisorId: input.advisorId, rubricId: input.rubricId } },
        create: { projectTeamId: input.teamId, advisorId: input.advisorId, rubricId: input.rubricId },
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
    const { teamId, ...feedback } = input;
    await this.client.advisorFeedback.create({ data: { ...feedback, projectTeamId: teamId } });
    return true;
  }
}
