import type { PrismaClient } from "@/generated/prisma/client";

export type ProgramScoreboardRow = {
  teamId: string;
  teamName: string;
  projectId: string;
  projectTitle: string;
  divisionName: string | null;
  divisionPosition: number;
  staffTotal: number | null;
  staffScorerNames: string[];
  advisorScores: Array<{ advisorId: string; advisorName: string; total: number }>;
  advisorAverage: number | null;
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
 * 순위는 정하지 않는다. 무엇으로 줄을 세울지는 심사가 정할 일이라 숫자만 내놓는다.
 */
export async function programScoreboard(
  client: PrismaClient,
  programId: string,
): Promise<ProgramScoreboardRow[]> {
  const [teams, tallies] = await Promise.all([
    client.projectTeam.findMany({
      where: { project: { programId } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        archivedVoteCount: true,
        project: {
          select: {
            id: true,
            title: true,
            division: { select: { name: true, position: true } },
          },
        },
        rubricEvaluations: {
          where: { rubric: { archivedAt: null } },
          select: { scores: { select: { points: true, scoredByName: true } } },
        },
        advisorEvaluations: {
          where: { rubric: { archivedAt: null } },
          select: {
            advisorId: true,
            advisor: { select: { name: true } },
            scores: { select: { points: true } },
          },
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
    const staffScores = team.rubricEvaluations.flatMap((evaluation) => evaluation.scores);
    // 한 위원이 팀당 루브릭 수만큼 행을 가진다. 위원 단위로 합쳐야 많이 채점한 위원이
    // 평균에서 가중되지 않는다.
    const byAdvisor = new Map<string, { advisorId: string; advisorName: string; total: number }>();
    for (const evaluation of team.advisorEvaluations) {
      const total = evaluation.scores.reduce((sum, score) => sum + score.points, 0);
      const current = byAdvisor.get(evaluation.advisorId);
      if (current) current.total += total;
      else byAdvisor.set(evaluation.advisorId, { advisorId: evaluation.advisorId, advisorName: evaluation.advisor.name, total });
    }
    const advisorScores = [...byAdvisor.values()];

    return {
      teamId: team.id,
      teamName: team.name,
      projectId: team.project.id,
      projectTitle: team.project.title,
      divisionName: team.project.division?.name ?? null,
      divisionPosition: team.project.division?.position ?? Number.MAX_SAFE_INTEGER,
      staffTotal: staffScores.length ? staffScores.reduce((sum, score) => sum + score.points, 0) : null,
      staffScorerNames: [...new Set(staffScores.map((score) => score.scoredByName))].sort((left, right) => left.localeCompare(right, "ko")),
      advisorScores,
      advisorAverage: advisorScores.length
        ? advisorScores.reduce((sum, score) => sum + score.total, 0) / advisorScores.length
        : null,
      // 옮겨 온 지난 대회는 표를 한 장씩 갖고 있지 않고 합계만 팀에 적혀 있다.
      voteCount: votesByTopic.get(team.project.id) ?? team.archivedVoteCount ?? 0,
    };
  });
}
