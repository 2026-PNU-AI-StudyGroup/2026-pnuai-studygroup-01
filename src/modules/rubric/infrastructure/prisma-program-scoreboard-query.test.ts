import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { programScoreboard } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";

function clientWith(teams: unknown[], tallies: unknown[]) {
  return {
    projectTeam: { findMany: vi.fn().mockResolvedValue(teams) },
    projectVote: { groupBy: vi.fn().mockResolvedValue(tallies) },
  } as unknown as PrismaClient;
}

// 채점표 둘: 공통(항목 2개, 50+30) 과 분과(항목 1개, 20). 만점 100.
const common = { criteria: [{ maxPoints: 50 }, { maxPoints: 30 }] };
const division = { criteria: [{ maxPoints: 20 }] };

const team = {
  id: "team-1",
  name: "1팀",
  number: null,
  award: null,
  archivedVoteCount: null,
  project: {
    id: "topic-1",
    title: "졸업 과제",
    division: { name: "인공지능", position: 0 },
    advisors: [
      { userId: "adv-1", user: { name: "박위원", email: "park@example.com" } },
      { userId: "adv-2", user: { name: "최위원", email: "choi@example.com" } },
      { userId: "adv-3", user: { name: "윤위원", email: "yoon@example.com" } },
    ],
  },
  rubricEvaluations: [
    { rubricId: "r-common", rubric: common, scores: [{ points: 30, scoredByName: "김교수" }, { points: 20, scoredByName: "김교수" }] },
    { rubricId: "r-division", rubric: division, scores: [{ points: 15, scoredByName: "이조교" }] },
  ],
  advisorEvaluations: [
    // 박위원: 둘 다 채점, 90점
    { advisorId: "adv-1", rubricId: "r-common", scores: [{ points: 40 }, { points: 30 }] },
    { advisorId: "adv-1", rubricId: "r-division", scores: [{ points: 20 }] },
    // 최위원: 공통만 채점, 45점. 평균에서 빠져야 한다.
    { advisorId: "adv-2", rubricId: "r-common", scores: [{ points: 25 }, { points: 20 }] },
    // 배정이 풀린 위원의 점수는 남아 있어도 세지 않는다.
    { advisorId: "adv-gone", rubricId: "r-common", scores: [{ points: 50 }, { points: 30 }] },
    { advisorId: "adv-gone", rubricId: "r-division", scores: [{ points: 20 }] },
  ],
};

describe("programScoreboard", () => {
  it("내부 채점표를 모두 채점하면 통째로 더하고 채점자 이름은 중복 없이 모은다", async () => {
    const [row] = await programScoreboard(clientWith([team], []), "program-1");

    expect(row.staffTotal).toBe(65);
    expect(row.staffProgress).toEqual({ scored: 2, total: 2 });
    expect(row.staffScorerNames).toEqual(["김교수", "이조교"]);
    expect(row.maxPoints).toBe(100);
  });

  it("내부 채점표를 일부만 채점했으면 총점을 비우고 진행만 싣는다", async () => {
    const partial = { ...team, rubricEvaluations: [team.rubricEvaluations[0], { ...team.rubricEvaluations[1], scores: [] }] };
    const [row] = await programScoreboard(clientWith([partial], []), "program-1");

    expect(row.staffTotal).toBeNull();
    expect(row.staffProgress).toEqual({ scored: 1, total: 2 });
  });

  it("자문 평균은 채점표를 모두 채점한 위원만으로 낸다", async () => {
    const [row] = await programScoreboard(clientWith([team], []), "program-1");

    expect(row.advisorScores).toEqual([
      { advisorId: "adv-1", advisorName: "박위원", advisorEmail: "park@example.com", total: 90, scoredRubrics: 2, complete: true },
      { advisorId: "adv-2", advisorName: "최위원", advisorEmail: "choi@example.com", total: 45, scoredRubrics: 1, complete: false },
      { advisorId: "adv-3", advisorName: "윤위원", advisorEmail: "yoon@example.com", total: 0, scoredRubrics: 0, complete: false },
    ]);
    // (90 + 45) / 2 = 67.5 가 아니라 다 채점한 박위원 하나의 90.
    expect(row.advisorAverage).toBe(90);
    expect(row.advisorProgress).toEqual({ complete: 1, assigned: 3 });
  });

  it("배정이 풀린 위원의 점수는 집계에서 뺀다", async () => {
    const [row] = await programScoreboard(clientWith([team], []), "program-1");

    expect(row.advisorScores.map((cell) => cell.advisorId)).not.toContain("adv-gone");
  });

  it("득표는 주제 기준으로 붙이고 표가 없으면 0이다", async () => {
    const other = { ...team, id: "team-2", name: "2팀", project: { ...team.project, id: "topic-2" } };
    const rows = await programScoreboard(
      clientWith([team, other], [{ topicId: "topic-1", _count: { _all: 7 } }]),
      "program-1",
    );

    expect(rows.map((row) => row.voteCount)).toEqual([7, 0]);
  });

  it("표를 한 장씩 갖고 있지 않은 지난 대회는 팀에 적힌 합계를 쓴다", async () => {
    const archived = { ...team, archivedVoteCount: 12 };
    const [row] = await programScoreboard(clientWith([archived], []), "program-1");

    expect(row.voteCount).toBe(12);
  });

  it("채점이 하나도 없으면 총점과 평균을 0이 아니라 비워 둔다", async () => {
    const blank = { ...team, rubricEvaluations: team.rubricEvaluations.map((evaluation) => ({ ...evaluation, scores: [] })), advisorEvaluations: [] };
    const [row] = await programScoreboard(clientWith([blank], []), "program-1");

    expect(row.staffTotal).toBeNull();
    expect(row.advisorAverage).toBeNull();
    expect(row.staffScorerNames).toEqual([]);
  });

  it("공개된 프로젝트의 확정된 팀만, 보관하지 않은 채점표만 센다", async () => {
    const client = clientWith([team], []);
    await programScoreboard(client, "program-1");

    const args = vi.mocked(client.projectTeam.findMany).mock.calls[0][0]!;
    expect(args.where).toEqual({ project: { programId: "program-1", status: "ACTIVE" }, confirmedAt: { not: null } });
    const select = args.select as Record<string, { where?: unknown }>;
    expect(select.rubricEvaluations.where).toEqual({ rubric: { archivedAt: null, legacy: false } });
    expect(select.advisorEvaluations.where).toEqual({ rubric: { archivedAt: null, legacy: false } });
  });
});
