import type { PrismaClient } from "@/generated/prisma/client";

export type ProgramAdvisorRow = {
  userId: string;
  name: string;
  email: string;
  accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
  /** 초대를 거둔 시각. null 이면 지금 이 프로그램의 심사단이다. */
  revokedAt: Date | null;
  assignedTopicIds: string[];
  activeToken: { expiresAt: Date } | null;
};

// 프로그램 화면용: 이 프로그램에 불러 둔 위원 + 이 프로그램 topic 할당 현황.
// 다른 프로그램 위원은 여기 나오지 않는다. 운영자가 이 화면에서 보는 것은 이 프로그램의 심사단이다.
//
// 계정이 비활성인 위원도, 초대를 거둔 위원도 걸러 내지 않는다.
//
// 예전에는 활성 계정 + 살아 있는 초대만 골랐다. 그래서 초대를 거두면 그 위원이 화면에서
// 사라졌고, 운영자가 사용자 관리에서 계정을 다시 활성화해도 이 목록 어디에도 돌아오지
// 않았다. 되살리는 길(같은 이메일로 다시 초대)이 화면에 드러나지 않아 막힌 것처럼 보였다.
//
// 상태를 함께 실어 화면이 현재 심사단과 거둔 위원을 나눠 세우게 한다. 초대는
// (programId, userId) 유니크라 사람당 한 행이어서 거둔 이력이 무한정 쌓이지 않는다.
export async function listProgramAdvisors(client: PrismaClient, programId: string): Promise<ProgramAdvisorRow[]> {
  const invitations = await client.programAdvisorInvitation.findMany({
    where: { programId },
    // 살아 있는 초대가 먼저, 거둔 초대는 최근에 거둔 것부터.
    orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "asc" }],
    select: {
      revokedAt: true,
      tokens: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" }, take: 1, select: { expiresAt: true },
      },
      user: {
        select: {
          id: true, name: true, email: true, accountStatus: true,
          projectAdvisors: { where: { topic: { programId } }, select: { topicId: true } },
        },
      },
    },
  });
  return invitations.map((invitation) => ({
    userId: invitation.user.id,
    name: invitation.user.name,
    email: invitation.user.email,
    accountStatus: invitation.user.accountStatus,
    revokedAt: invitation.revokedAt,
    assignedTopicIds: invitation.user.projectAdvisors.map((row) => row.topicId),
    activeToken: invitation.tokens[0] ?? null,
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
  const teams = await client.projectTeam.findMany({
    where: { project: { programId } },
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
  team: { name: string; confirmedAt: Date | null } | null;
};

// 할당 체크박스용: 프로그램의 topic(+팀명) 목록.
export async function listProgramTopicsForAssignment(client: PrismaClient, programId: string): Promise<ProgramTopicForAssignment[]> {
  return client.topic.findMany({
    where: { programId },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, projectTeam: { select: { name: true, confirmedAt: true } } },
  }).then((topics) => topics.map(({ projectTeam, ...topic }) => ({ ...topic, team: projectTeam })));
}
