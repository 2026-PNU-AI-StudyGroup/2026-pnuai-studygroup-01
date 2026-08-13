import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";

describe("지난 프로젝트 기술 검색", () => {
  it("기술 배열을 대소문자와 부분 문자열에 관계없이 찾은 팀 식별자로 목록 조건을 만든다", async () => {
    const count = vi.fn(async () => 1);
    const queryRaw = vi.fn(async () => [{ id: "team-next" }]);
    const client = {
      $queryRaw: queryRaw,
      projectTeam: { count },
    } as unknown as PrismaClient;

    await new PrismaTeamArchiveQueryRepository(client).countClosed({ query: "next" });

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        confirmedAt: { not: null },
        project: { program: { isStudentPublic: true, endsAt: { lte: expect.any(Date) } } },
        AND: [expect.objectContaining({
          OR: expect.arrayContaining([{ id: { in: ["team-next"] } }]),
        })],
      }),
    });
  });

  it("아카이브 프로그램에 서울 기준 시작 연도를 제공한다", async () => {
    const findMany = vi.fn(async () => [{
      id: "program-2025",
      name: "캡스톤 2025",
      category: "캡스톤",
      startsAt: new Date("2025-12-31T15:00:00.000Z"),
      endsAt: new Date("2026-12-20T14:59:59.000Z"),
      projectRegistrationStartsAt: new Date("2025-12-01T00:00:00.000Z"),
      projectRegistrationEndsAt: new Date("2025-12-31T00:00:00.000Z"),
      votingPolicy: {
        startsAt: new Date("2026-12-01T00:00:00.000Z"),
        endsAt: new Date("2026-12-07T00:00:00.000Z"),
      },
    }]);
    const client = {
      projectProgram: { findMany },
    } as unknown as PrismaClient;

    await expect(new PrismaTeamArchiveQueryRepository(client).listPrograms()).resolves.toEqual([{
      id: "program-2025",
      name: "캡스톤 2025",
      category: "캡스톤",
      startsAt: new Date("2025-12-31T15:00:00.000Z"),
      endsAt: new Date("2026-12-20T14:59:59.000Z"),
      projectRegistrationStartsAt: new Date("2025-12-01T00:00:00.000Z"),
      projectRegistrationEndsAt: new Date("2025-12-31T00:00:00.000Z"),
      votingPolicy: {
        startsAt: new Date("2026-12-01T00:00:00.000Z"),
        endsAt: new Date("2026-12-07T00:00:00.000Z"),
      },
      startYear: 2026,
    }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        startsAt: true,
        endsAt: true,
        projectRegistrationStartsAt: true,
        projectRegistrationEndsAt: true,
        votingPolicy: { select: { startsAt: true, endsAt: true } },
      }),
    }));
  });

  it("아카이브 명단에는 종료되지 않은 멤버십만 포함한다", async () => {
    const findMany = vi.fn(async () => []);
    const client = {
      projectTeam: { findMany },
    } as unknown as PrismaClient;

    await new PrismaTeamArchiveQueryRepository(client).listClosed({
      offset: 0,
      limit: 20,
      filters: {},
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        memberships: expect.objectContaining({ where: { endedAt: null } }),
      }),
    }));
  });
});
