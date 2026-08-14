import type { PrismaClient } from "@/generated/prisma/client";

export type ProgramAdvisorRow = {
  userId: string;
  name: string;
  email: string;
  assignedTopicIds: string[];
  activeToken: { expiresAt: Date } | null;
};

// 프로그램 화면용: 전체 ADVISOR + 이 프로그램 topic 할당 현황.
export async function listProgramAdvisors(client: PrismaClient, programId: string): Promise<ProgramAdvisorRow[]> {
  const advisors = await client.user.findMany({
    where: { role: "ADVISOR", isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true,
      projectAdvisors: { where: { topic: { programId } }, select: { topicId: true } },
      advisorAccessTokens: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" }, take: 1, select: { expiresAt: true },
      },
    },
  });
  return advisors.map((advisor) => ({
    userId: advisor.id,
    name: advisor.name,
    email: advisor.email,
    assignedTopicIds: advisor.projectAdvisors.map((row) => row.topicId),
    activeToken: advisor.advisorAccessTokens[0] ?? null,
  }));
}

export type AdvisorScoreMatrixRow = {
  teamId: string; teamName: string;
  scores: Array<{ advisorId: string; advisorName: string; total: number }>;
  average: number | null;
};

// 점수 집계: 프로그램 내 팀 × 자문위원 총점 매트릭스.
// AdvisorEvaluation 유니크가 (teamId, advisorId, rubricId)라 한 위원이 팀당 루브릭 수만큼 행을 가진다.
// 위원 단위로 합산하고 평균은 위원 수로 나눈다 — 루브릭을 더 많이 채점한 위원이 가중되지 않도록.
export async function advisorScoreMatrix(client: PrismaClient, programId: string): Promise<AdvisorScoreMatrixRow[]> {
  const teams = await client.team.findMany({
    where: { programId },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true,
      advisorEvaluations: {
        where: { rubric: { archivedAt: null } },
        select: {
          advisorId: true,
          advisor: { select: { name: true } },
          scores: { select: { points: true } },
        },
      },
    },
  });
  return teams.map((team) => {
    const byAdvisor = new Map<string, { advisorId: string; advisorName: string; total: number }>();
    for (const evaluation of team.advisorEvaluations) {
      const total = evaluation.scores.reduce((sum, score) => sum + score.points, 0);
      const current = byAdvisor.get(evaluation.advisorId);
      if (current) current.total += total;
      else byAdvisor.set(evaluation.advisorId, { advisorId: evaluation.advisorId, advisorName: evaluation.advisor.name, total });
    }
    const scores = [...byAdvisor.values()];
    return {
      teamId: team.id, teamName: team.name, scores,
      average: scores.length ? scores.reduce((sum, s) => sum + s.total, 0) / scores.length : null,
    };
  });
}

export type ProgramTopicForAssignment = {
  id: string;
  title: string;
  team: { name: string; status: "FORMING" | "CONFIRMED" | "CLOSED" } | null;
};

// 할당 체크박스용: 프로그램의 topic(+팀명) 목록.
export async function listProgramTopicsForAssignment(client: PrismaClient, programId: string): Promise<ProgramTopicForAssignment[]> {
  return client.topic.findMany({
    where: { programId },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, team: { select: { name: true, status: true } } },
  });
}
