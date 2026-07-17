import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTeamArchiveRepository } from "@/modules/team/infrastructure/prisma-team-archive-repository";

describe("지난 프로젝트 기술 검색", () => {
  it("기술 배열을 대소문자와 부분 문자열에 관계없이 찾은 팀 식별자로 목록 조건을 만든다", async () => {
    const count = vi.fn(async () => 1);
    const queryRaw = vi.fn(async () => [{ id: "team-next" }]);
    const client = {
      $queryRaw: queryRaw,
      team: { count },
    } as unknown as PrismaClient;

    await new PrismaTeamArchiveRepository(client).countClosed({ query: "next" });

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "CLOSED",
        AND: [expect.objectContaining({
          OR: expect.arrayContaining([{ id: { in: ["team-next"] } }]),
        })],
      }),
    });
  });
});
