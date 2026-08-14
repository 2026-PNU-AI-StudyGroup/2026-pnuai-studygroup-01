import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { advisorScoreMatrix } from "@/modules/advisor/infrastructure/prisma-advisor-admin-query";

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
