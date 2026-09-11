import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { advisorScoreMatrix, listProgramAdvisors } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";

describe("advisorScoreMatrix", () => {
  it("한 위원이 루브릭 2개를 채점하면 총점을 합산하고 평균은 위원 수로 나눈다", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "team-1",
        name: "1팀",
        advisorEvaluations: [
          { advisorId: "adv-1", advisor: { name: "김위원" }, scores: [{ points: 30 }, { points: 20 }] },
          { advisorId: "adv-1", advisor: { name: "김위원" }, scores: [{ points: 10 }] },
          { advisorId: "adv-2", advisor: { name: "이위원" }, scores: [{ points: 40 }] },
        ],
      },
    ]);
    const client = { projectTeam: { findMany } } as unknown as PrismaClient;

    const [row] = await advisorScoreMatrix(client, "program-1");

    expect(row.scores).toEqual([
      { advisorId: "adv-1", advisorName: "김위원", total: 60 },
      { advisorId: "adv-2", advisorName: "이위원", total: 40 },
    ]);
    // 평가 행 3개가 아니라 위원 2명으로 나눈다.
    expect(row.average).toBe(50);
    expect(findMany.mock.calls[0][0].select.advisorEvaluations.where).toEqual({ rubric: { archivedAt: null } });
  });
});

describe("listProgramAdvisors", () => {
  function clientWith(rows: unknown[]) {
    const findMany = vi.fn().mockResolvedValue(rows);
    return { client: { programAdvisorInvitation: { findMany } } as unknown as PrismaClient, findMany };
  }

  it("계정이 비활성인 위원도 목록에 남기고 상태를 실어 보낸다", async () => {
    // 활성 계정만 고르면 사용자 관리에서 비활성화한 순간 목록에서 사라져, 초대가 살아 있는
    // 위원이 왜 안 보이는지 운영자가 알 수 없었다.
    const { client, findMany } = clientWith([
      {
        revokedAt: null,
        tokens: [],
        user: { id: "adv-1", name: "김위원", email: "kim@example.com", accountStatus: "DISABLED", projectAdvisors: [{ topicId: "topic-1" }] },
      },
      {
        revokedAt: null,
        tokens: [{ expiresAt: new Date("2026-10-01T00:00:00Z") }],
        user: { id: "adv-2", name: "이위원", email: "lee@example.com", accountStatus: "ACTIVE", projectAdvisors: [] },
      },
    ]);

    const rows = await listProgramAdvisors(client, "program-1");

    expect(rows.map((row) => [row.userId, row.accountStatus])).toEqual([["adv-1", "DISABLED"], ["adv-2", "ACTIVE"]]);
    // 계정 상태로도, 회수 여부로도 걸러 내지 않는다. 화면이 나눠 세운다.
    expect(findMany.mock.calls[0][0].where).toEqual({ programId: "program-1" });
  });

  it("초대를 거둔 위원도 회수 시각과 함께 남긴다", async () => {
    // 걸러 내면 그 위원이 화면에서 사라져 다시 부르는 길이 어디에도 보이지 않았다.
    const revokedAt = new Date("2026-09-05T00:00:00Z");
    const { client, findMany } = clientWith([
      {
        revokedAt: null,
        tokens: [],
        user: { id: "adv-1", name: "김위원", email: "kim@example.com", accountStatus: "ACTIVE", projectAdvisors: [] },
      },
      {
        revokedAt,
        tokens: [],
        user: { id: "adv-9", name: "박위원", email: "park@example.com", accountStatus: "DISABLED", projectAdvisors: [] },
      },
    ]);

    const rows = await listProgramAdvisors(client, "program-1");

    expect(rows.map((row) => [row.userId, row.revokedAt])).toEqual([["adv-1", null], ["adv-9", revokedAt]]);
    // 살아 있는 초대가 먼저, 거둔 초대는 최근에 거둔 것부터.
    expect(findMany.mock.calls[0][0].orderBy).toEqual([
      { revokedAt: { sort: "desc", nulls: "first" } },
      { createdAt: "asc" },
    ]);
  });
});
