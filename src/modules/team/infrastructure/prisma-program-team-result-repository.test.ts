import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProgramTeamResultRepository } from "@/modules/team/infrastructure/prisma-program-team-result-repository";

function client(updateMany: ReturnType<typeof vi.fn>) {
  return {
    projectTeam: { updateMany },
    $transaction: (operations: unknown[]) => Promise.all(operations as Promise<{ count: number }>[]),
  } as unknown as PrismaClient;
}

describe("PrismaProgramTeamResultRepository", () => {
  it("팀 id 에 프로그램 조건을 같이 걸어 고친다", async () => {
    // 조건이 팀 id 뿐이면 남의 프로그램 팀 id 를 끼워 넣어 상을 바꿀 수 있다.
    const updateMany = vi.fn(async () => ({ count: 1 }));

    const changed = await new PrismaProgramTeamResultRepository(client(updateMany)).saveResults("program-1", [
      { teamId: "team-1", number: 1, award: "대상" },
      { teamId: "team-2", number: null, award: null },
    ]);

    expect(changed).toBe(2);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "team-1", project: { programId: "program-1" } },
      data: { number: 1, award: "대상" },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "team-2", project: { programId: "program-1" } },
      data: { number: null, award: null },
    });
  });

  it("프로그램에 없는 팀은 세지 않는다", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));

    const changed = await new PrismaProgramTeamResultRepository(client(updateMany)).saveResults("program-1", [
      { teamId: "다른-프로그램-팀", number: 1, award: "대상" },
    ]);

    expect(changed).toBe(0);
  });

  it("보낼 것이 없으면 조회하지 않는다", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));

    expect(await new PrismaProgramTeamResultRepository(client(updateMany)).saveResults("program-1", [])).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
