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

describe("인기상 자동 표시", () => {
  function archivedTeam(overrides: {
    topicId: string;
    name: string;
    award?: string | null;
    votingPolicy?: { endsAt: Date; resultsVisibleAfterVoting: boolean } | null;
  }) {
    return {
      id: `team-${overrides.topicId}`,
      name: overrides.name,
      showcaseIntro: null,
      award: overrides.award ?? null,
      archivedVoteCount: null,
      project: {
        id: overrides.topicId,
        title: overrides.name,
        description: "",
        advisorRole: "지도교수",
        sourceUrl: null,
        thumbnailPath: null,
        posterPath: null,
        divisionId: null,
        division: null,
        program: {
          id: "program-1",
          name: "해커톤",
          category: "해커톤",
          advisorEnabled: false,
          startsAt: new Date("2025-03-01T00:00:00.000Z"),
          votingPolicy: overrides.votingPolicy ?? null,
        },
        manager: { name: "김교수" },
      },
      memberships: [],
      artifacts: [],
    };
  }

  function clientWith(input: {
    teams: ReturnType<typeof archivedTeam>[];
    policies?: unknown[];
    tallies?: unknown[];
    archived?: unknown[];
  }) {
    // listClosed 가 첫 번째 호출, 보관 득표 조회가 두 번째 호출이다.
    const findMany = vi.fn()
      .mockResolvedValueOnce(input.teams)
      .mockResolvedValueOnce(input.archived ?? []);
    return {
      projectTeam: { findMany },
      programVotingPolicy: { findMany: vi.fn(async () => input.policies ?? []) },
      projectVote: { groupBy: vi.fn(async () => input.tallies ?? []) },
    } as unknown as PrismaClient;
  }

  const listClosed = (client: PrismaClient) =>
    new PrismaTeamArchiveQueryRepository(client, "ADMIN").listClosed({ offset: 0, limit: 20, filters: {} });

  it("옮겨 온 대회는 팀에 적힌 보관 득표로 상위 두 팀을 고른다", async () => {
    const teams = [
      archivedTeam({ topicId: "topic-1", name: "온기", award: "최우수상" }),
      archivedTeam({ topicId: "topic-2", name: "반짝이", award: "최우수상" }),
      archivedTeam({ topicId: "topic-3", name: "손길모아", award: "대상" }),
    ];
    const client = clientWith({
      teams,
      archived: [
        { archivedVoteCount: 59, project: { id: "topic-1", programId: "program-1" } },
        { archivedVoteCount: 33, project: { id: "topic-2", programId: "program-1" } },
        { archivedVoteCount: 18, project: { id: "topic-3", programId: "program-1" } },
      ],
    });

    const projects = await listClosed(client);

    expect(projects.map((project) => [project.topicTitle, project.popularAward])).toEqual([
      ["온기", true],
      ["반짝이", true],
      ["손길모아", false],
    ]);
    // 이미 받은 상은 그대로 두고 인기상만 얹는다.
    expect(projects[0]!.award).toBe("최우수상");
  });

  it("실제로 들어온 표가 있으면 보관 합계보다 그쪽을 쓴다", async () => {
    const teams = [
      archivedTeam({ topicId: "topic-1", name: "온기", votingPolicy: { endsAt: new Date("2020-01-01"), resultsVisibleAfterVoting: true } }),
      archivedTeam({ topicId: "topic-2", name: "반짝이", votingPolicy: { endsAt: new Date("2020-01-01"), resultsVisibleAfterVoting: true } }),
      archivedTeam({ topicId: "topic-3", name: "손길모아", votingPolicy: { endsAt: new Date("2020-01-01"), resultsVisibleAfterVoting: true } }),
    ];
    const client = clientWith({
      teams,
      policies: [{
        programId: "program-1",
        startsAt: new Date("2019-12-01"),
        endsAt: new Date("2020-01-01"),
        voteLimit: 2,
        selfVotingAllowed: false,
        resultsVisibleDuringVoting: false,
        resultsVisibleAfterVoting: true,
      }],
      archived: [{ archivedVoteCount: 99, project: { id: "topic-3", programId: "program-1" } }],
      tallies: [
        { programId: "program-1", topicId: "topic-1", _count: { _all: 7 } },
        { programId: "program-1", topicId: "topic-2", _count: { _all: 5 } },
        { programId: "program-1", topicId: "topic-3", _count: { _all: 1 } },
      ],
    });

    const projects = await listClosed(client);

    expect(projects.map((project) => [project.topicTitle, project.popularAward])).toEqual([
      ["온기", true],
      ["반짝이", true],
      ["손길모아", false],
    ]);
  });

  it("투표가 아직 안 끝난 프로그램에는 붙이지 않는다", async () => {
    const openPolicy = { endsAt: new Date("2999-01-01"), resultsVisibleAfterVoting: true };
    const client = clientWith({
      teams: [archivedTeam({ topicId: "topic-1", name: "온기", votingPolicy: openPolicy })],
      policies: [{
        programId: "program-1",
        startsAt: new Date("2020-01-01"),
        endsAt: new Date("2999-01-01"),
        voteLimit: 2,
        selfVotingAllowed: false,
        resultsVisibleDuringVoting: true,
        resultsVisibleAfterVoting: true,
      }],
      tallies: [{ programId: "program-1", topicId: "topic-1", _count: { _all: 9 } }],
    });

    const [project] = await listClosed(client);

    expect(project!.popularAward).toBe(false);
  });
});
