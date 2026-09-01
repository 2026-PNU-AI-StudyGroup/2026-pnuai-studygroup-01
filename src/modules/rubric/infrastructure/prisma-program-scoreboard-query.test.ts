import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { programScoreboard } from "@/modules/rubric/infrastructure/prisma-program-scoreboard-query";

function clientWith(teams: unknown[], tallies: unknown[]) {
  return {
    projectTeam: { findMany: vi.fn().mockResolvedValue(teams) },
    projectVote: { groupBy: vi.fn().mockResolvedValue(tallies) },
  } as unknown as PrismaClient;
}

const team = {
  id: "team-1",
  name: "1팀",
  project: { id: "topic-1", title: "졸업 과제", division: { name: "인공지능", position: 0 } },
  rubricEvaluations: [
    { scores: [{ points: 30, scoredByName: "김교수" }, { points: 20, scoredByName: "김교수" }] },
    { scores: [{ points: 15, scoredByName: "이조교" }] },
  ],
  advisorEvaluations: [
    { advisorId: "adv-1", advisor: { name: "박위원" }, scores: [{ points: 30 }, { points: 20 }] },
    { advisorId: "adv-1", advisor: { name: "박위원" }, scores: [{ points: 10 }] },
    { advisorId: "adv-2", advisor: { name: "최위원" }, scores: [{ points: 40 }] },
  ],
};

describe("programScoreboard", () => {
  it("내부 채점표는 통째로 더하고 채점자 이름은 중복 없이 모은다", async () => {
    const [row] = await programScoreboard(clientWith([team], []), "program-1");

    expect(row.staffTotal).toBe(65);
    expect(row.staffScorerNames).toEqual(["김교수", "이조교"]);
  });

  it("자문위원 점수는 위원 단위로 합치고 평균은 위원 수로 나눈다", async () => {
    const [row] = await programScoreboard(clientWith([team], []), "program-1");

    expect(row.advisorScores).toEqual([
      { advisorId: "adv-1", advisorName: "박위원", total: 60 },
      { advisorId: "adv-2", advisorName: "최위원", total: 40 },
    ]);
    // 평가 행 3개가 아니라 위원 2명으로 나눈다.
    expect(row.advisorAverage).toBe(50);
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
    const blank = { ...team, rubricEvaluations: [], advisorEvaluations: [] };
    const [row] = await programScoreboard(clientWith([blank], []), "program-1");

    expect(row.staffTotal).toBeNull();
    expect(row.advisorAverage).toBeNull();
    expect(row.staffScorerNames).toEqual([]);
  });

  it("보관한 채점표는 집계에서 뺀다", async () => {
    const client = clientWith([team], []);
    await programScoreboard(client, "program-1");

    const select = vi.mocked(client.projectTeam.findMany).mock.calls[0][0]!.select as Record<string, { where?: unknown }>;
    expect(select.rubricEvaluations.where).toEqual({ rubric: { archivedAt: null } });
    expect(select.advisorEvaluations.where).toEqual({ rubric: { archivedAt: null } });
  });
});
