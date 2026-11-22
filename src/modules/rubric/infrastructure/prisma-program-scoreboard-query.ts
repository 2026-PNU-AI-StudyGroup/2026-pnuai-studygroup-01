import type { PrismaClient } from "@/generated/prisma/client";

export type AdvisorScoreCell = {
  advisorId: string;
  advisorName: string;
  advisorEmail: string;
  /** 저장한 채점표 점수의 합. 다 채점하지 않았으면 지금까지의 합이다. */
  total: number;
  /** 다 채점한 채점표 수. 0 이면 아직 손대지 않은 위원이다. */
  scoredRubrics: number;
  /** 팀에 걸린 채점표를 모두 채점했는지. 평균에는 다 채점한 위원만 들어간다. */
  complete: boolean;
};

export type ProgramScoreboardRow = {
  teamId: string;
  teamName: string;
  /** 행사에서 매기는 번호. 이 표에서 적는다. */
  teamNumber: number | null;
  /** 오프라인 심사로 정해진 수상 내역. 이 표에서 적는다. */
  award: string | null;
  projectId: string;
  projectTitle: string;
  divisionName: string | null;
  divisionPosition: number;
  /** 팀에 걸린 채점표를 모두 채점해야 나온다. 일부만 채점했으면 null 이고 진행은 staffProgress 에 있다. */
  staffTotal: number | null;
  staffProgress: { scored: number; total: number };
  staffScorerNames: string[];
  /** 지금 이 팀에 배정된 위원만. 배정을 풀거나 초대를 거둔 위원의 점수는 빠진다. */
  advisorScores: AdvisorScoreCell[];
  /** 다 채점한 위원의 평균. 한 명도 없으면 null. */
  advisorAverage: number | null;
  advisorProgress: { complete: number; assigned: number };
  /** 팀에 걸린 채점표의 만점 합. 분과마다 채점표가 달라 만점도 다르다. */
  maxPoints: number;
  voteCount: number;
};

/**
 * 심사 집계표. 프로그램 한 개의 팀을 한 줄씩, 점수가 나오는 곳을 모두 옆으로 붙인다.
 *
 * 세 갈래가 따로 살고 있어 지금까지 가로질러 볼 방법이 없었다.
 * 내부 채점표(`ProjectTeamRubricEvaluation`)는 팀·루브릭당 한 벌이고 누가 넣었는지는
 * `scoredByName` 에만 남는다. 자문위원 채점(`AdvisorEvaluation`)은 위원마다 한 벌이다.
 * 득표는 아예 다른 표에 있다.
 *
 * 채점표가 둘인 팀에서 하나만 채점한 위원의 합을 그대로 평균에 넣으면 그 팀 점수가 반으로
 * 깎인다. 그래서 팀에 걸린 채점표를 모두 채점한 위원만 평균에 넣고, 진행 정도를 따로 싣는다.
 * 집계 대상은 공개된 프로젝트의 확정된 팀뿐이다. 위원 채점 화면도 같은 팀만 연다.
 *
 * 순위는 정하지 않는다. 무엇으로 줄을 세울지는 심사가 정할 일이라 숫자만 내놓는다.
 */
export async function programScoreboard(
  client: PrismaClient,
  programId: string,
): Promise<ProgramScoreboardRow[]> {
  const [teams, tallies] = await Promise.all([
    client.projectTeam.findMany({
      where: { project: { programId, status: "ACTIVE" }, confirmedAt: { not: null } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        number: true,
        award: true,
        archivedVoteCount: true,
        project: {
          select: {
            id: true,
            title: true,
            division: { select: { name: true, position: true } },
            advisors: { select: { userId: true, user: { select: { name: true, email: true } } } },
          },
        },
        rubricEvaluations: {
          where: { rubric: { archivedAt: null, legacy: false } },
          select: {
            rubricId: true,
            rubric: { select: { criteria: { select: { maxPoints: true } } } },
            scores: { select: { points: true, scoredByName: true } },
          },
        },
        advisorEvaluations: {
          where: { rubric: { archivedAt: null, legacy: false } },
          select: { advisorId: true, rubricId: true, scores: { select: { points: true } } },
        },
      },
    }),
    client.projectVote.groupBy({
      by: ["topicId"],
      where: { programId },
      _count: { _all: true },
    }),
  ]);

  const votesByTopic = new Map(tallies.map((row) => [row.topicId, row._count._all]));

  return teams.map((team) => {
    // 팀에 걸린 채점표와 각 채점표의 항목 수. 모든 항목이 필수라 항목 수만큼 점수가 있으면 다 채점한 것이다.
    const criteriaCount = new Map(team.rubricEvaluations.map((evaluation) => [evaluation.rubricId, evaluation.rubric.criteria.length]));
    const isComplete = (rubricId: string, scoreCount: number) => {
      const count = criteriaCount.get(rubricId);
      return count !== undefined && count > 0 && scoreCount >= count;
    };
    const maxPoints = team.rubricEvaluations.reduce(
      (sum, evaluation) => sum + evaluation.rubric.criteria.reduce((subtotal, criterion) => subtotal + criterion.maxPoints, 0),
      0,
    );

    const staffScored = team.rubricEvaluations.filter((evaluation) => isComplete(evaluation.rubricId, evaluation.scores.length));
    const staffScores = team.rubricEvaluations.flatMap((evaluation) => evaluation.scores);
    const staffComplete = criteriaCount.size > 0 && staffScored.length === criteriaCount.size;

    // 한 위원이 팀당 루브릭 수만큼 행을 가진다. 위원 단위로 합쳐야 많이 채점한 위원이
    // 평균에서 가중되지 않는다.
    const advisorScores: AdvisorScoreCell[] = team.project.advisors.map(({ userId, user }) => {
      const evaluations = team.advisorEvaluations.filter((evaluation) => evaluation.advisorId === userId && criteriaCount.has(evaluation.rubricId));
      const done = evaluations.filter((evaluation) => isComplete(evaluation.rubricId, evaluation.scores.length)).length;
      return {
        advisorId: userId,
        advisorName: user.name,
        advisorEmail: user.email,
        total: evaluations.reduce((sum, evaluation) => sum + evaluation.scores.reduce((subtotal, score) => subtotal + score.points, 0), 0),
        scoredRubrics: done,
        complete: criteriaCount.size > 0 && done === criteriaCount.size,
      };
    });
    const completed = advisorScores.filter((cell) => cell.complete);

    return {
      teamId: team.id,
      teamName: team.name,
      teamNumber: team.number,
      award: team.award,
      projectId: team.project.id,
      projectTitle: team.project.title,
      divisionName: team.project.division?.name ?? null,
      divisionPosition: team.project.division?.position ?? Number.MAX_SAFE_INTEGER,
      staffTotal: staffComplete ? staffScores.reduce((sum, score) => sum + score.points, 0) : null,
      staffProgress: { scored: staffScored.length, total: criteriaCount.size },
      staffScorerNames: [...new Set(staffScores.map((score) => score.scoredByName))].sort((left, right) => left.localeCompare(right, "ko")),
      advisorScores,
      advisorAverage: completed.length ? completed.reduce((sum, cell) => sum + cell.total, 0) / completed.length : null,
      advisorProgress: { complete: completed.length, assigned: advisorScores.length },
      maxPoints,
      // 옮겨 온 지난 대회는 표를 한 장씩 갖고 있지 않고 합계만 팀에 적혀 있다.
      voteCount: votesByTopic.get(team.project.id) ?? team.archivedVoteCount ?? 0,
    };
  });
}
