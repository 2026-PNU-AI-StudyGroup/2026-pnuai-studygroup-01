import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";

describe("지난 프로젝트 기술 검색", () => {
  it("프로젝트와 결과물 제목을 대소문자와 무관하게 검색 조건에 포함한다", async () => {
    const count = vi.fn(async () => 1);
    const client = {
      projectTeam: { count },
    } as unknown as PrismaClient;

    await new PrismaTeamArchiveQueryRepository(client).countClosed({ query: "next" });

    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        confirmedAt: { not: null },
        project: { program: { isPublic: true, endsAt: { lte: expect.any(Date) } } },
        AND: [expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: "next", mode: "insensitive" } },
            { project: { title: { contains: "next", mode: "insensitive" } } },
            { artifacts: { some: { title: { contains: "next", mode: "insensitive" } } } },
          ]),
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
