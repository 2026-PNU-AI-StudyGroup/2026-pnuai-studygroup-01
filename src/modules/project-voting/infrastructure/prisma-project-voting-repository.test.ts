import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";

type ResultTopic = {
  id: string;
  title: string;
  description: string;
  divisionId: string | null;
  division: { name: string; position: number } | null;
  _count: { votes: number };
};

function client(identityVisibility: "ANONYMOUS" | "NAMED", topics: ResultTopic[] = [{
  id: "topic-1",
  title: "프로젝트",
  description: "설명",
  divisionId: null,
  division: null,
  _count: { votes: 1 },
}]) {
  return {
    projectProgram: {
      findUnique: vi.fn().mockResolvedValue({
        id: "program-1",
        name: "캡스톤",
        votingPolicy: {
          startsAt: new Date("2026-08-01T00:00:00Z"),
          endsAt: new Date("2026-08-31T00:00:00Z"),
          voteLimit: 3,
          voteLimitScope: "PROGRAM",
          selfVotingAllowed: false,
          identityVisibility,
        },
      }),
    },
    topic: {
      findMany: vi.fn().mockResolvedValue(topics),
    },
    projectVote: {
      count: vi.fn().mockResolvedValue(1),
      groupBy: vi.fn().mockResolvedValue([{ voterId: "voter-1" }]),
      findMany: vi.fn().mockResolvedValue([{ topicId: "topic-1", voter: { id: "voter-1", name: "김학생", email: "student@example.com" } }]),
    },
  } as unknown as PrismaClient;
}

function voteClient(role: string, voteLimit: number, staffVoteLimit: number) {
  const transaction = {
    $queryRaw: vi.fn()
      .mockResolvedValueOnce([{ id: "voter-1", role }])
      .mockResolvedValueOnce([{
        programId: "program-1",
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit,
        staffVoteLimit,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
        identityVisibility: "ANONYMOUS",
      }]),
    topic: {
      findMany: vi.fn().mockResolvedValue([
        { id: "topic-1", divisionId: null, authorId: "professor-1", managerId: "professor-1", assistants: [], team: null },
        { id: "topic-2", divisionId: null, authorId: "professor-1", managerId: "professor-1", assistants: [], team: null },
      ]),
    },
    projectVote: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 2 }) },
  };
  return { $transaction: vi.fn(async (run: (value: typeof transaction) => unknown) => run(transaction)) } as unknown as PrismaClient;
}

describe("PrismaProjectVotingRepository 표 저장", () => {
  const input = { programId: "program-1", voterId: "voter-1", topicIds: ["topic-1", "topic-2"], votedAt: new Date("2026-08-10T00:00:00Z") };

  it("자문위원에게는 staffVoteLimit을 적용해 저장한다", async () => {
    await expect(new PrismaProjectVotingRepository(voteClient("ADVISOR", 1, 5)).replaceVotes(input)).resolves.toBe("SAVED");
  });

  it("학생에게는 기존 voteLimit을 적용해 거절한다", async () => {
    await expect(new PrismaProjectVotingRepository(voteClient("STUDENT", 1, 5)).replaceVotes(input)).resolves.toBe("INVALID_CANDIDATE");
  });
});

describe("PrismaProjectVotingRepository 결과 조회", () => {
  it("비공개 프로그램의 투표 용지를 제공하지 않는다", async () => {
    const value = client("ANONYMOUS");
    value.projectProgram.findUnique = vi.fn().mockResolvedValue({
      id: "program-1",
      name: "캡스톤",
      isPublic: false,
      lifecycleStatus: "ACTIVE",
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
        identityVisibility: "ANONYMOUS",
      },
    });

    await expect(new PrismaProjectVotingRepository(value).findBallot("program-1", "voter-1", new Date("2026-08-10T00:00:00Z"))).resolves.toBeNull();
    expect(value.topic.findMany).not.toHaveBeenCalled();
  });

  it("운영 종료 프로그램도 공개 상태이고 투표 기간이면 실시간 득표와 함께 투표 용지를 제공한다", async () => {
    const value = client("ANONYMOUS");
    value.projectProgram.findUnique = vi.fn().mockResolvedValue({
      id: "program-1",
      name: "지난 캡스톤",
      isPublic: true,
      lifecycleStatus: "CLOSED",
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
        identityVisibility: "ANONYMOUS",
      },
    });
    value.topic.findMany = vi.fn().mockResolvedValue([{
      id: "topic-1",
      title: "프로젝트",
      description: "설명",
      divisionId: null,
      division: null,
      authorId: "professor-1",
      managerId: "professor-1",
      assistants: [],
      team: { members: [] },
    }]);
    value.projectVote.findMany = vi.fn().mockResolvedValue([]);
    value.projectVote.groupBy = vi.fn().mockResolvedValue([{ topicId: "topic-1", _count: { topicId: 4 } }]);

    const ballot = await new PrismaProjectVotingRepository(value).findBallot(
      "program-1",
      "voter-1",
      new Date("2026-08-10T00:00:00Z"),
    );

    expect(ballot?.phase).toBe("OPEN");
    expect(ballot?.candidates[0].voteCount).toBe(4);
  });

  it("익명 집계에서는 투표자 개인정보 관계를 조회하지 않는다", async () => {
    const value = client("ANONYMOUS");

    const results = await new PrismaProjectVotingRepository(value).findResults("program-1", new Date("2026-08-10T00:00:00Z"));

    expect(value.projectVote.findMany).not.toHaveBeenCalled();
    expect(results?.results[0].voters).toEqual([]);
  });

  it("기명 집계에서만 투표자 정보를 프로젝트별 결과에 연결한다", async () => {
    const value = client("NAMED");

    const results = await new PrismaProjectVotingRepository(value).findResults("program-1", new Date("2026-08-10T00:00:00Z"));

    expect(value.projectVote.findMany).toHaveBeenCalledWith({
      where: { programId: "program-1" },
      select: { topicId: true, voter: { select: { id: true, name: true, email: true } } },
    });
    expect(results?.results[0].voters).toEqual([{ id: "voter-1", name: "김학생", email: "student@example.com" }]);
  });

  it("분과별 결과와 투표 진행 순서를 설정된 분과 순서대로 반환한다", async () => {
    const value = client("ANONYMOUS", [
      { id: "topic-1", title: "가나다", description: "", divisionId: "division-2", division: { name: "융합", position: 1 }, _count: { votes: 3 } },
      { id: "topic-2", title: "라마바사", description: "", divisionId: "division-1", division: { name: "창업", position: 0 }, _count: { votes: 1 } },
      { id: "topic-3", title: "사아", description: "", divisionId: null, division: null, _count: { votes: 9 } },
    ]);
    value.projectProgram.findUnique = vi.fn().mockResolvedValue({
      id: "program-1",
      name: "캡스톤",
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "DIVISION",
        selfVotingAllowed: false,
        identityVisibility: "ANONYMOUS",
      },
    });

    const results = await new PrismaProjectVotingRepository(value).findResults("program-1", new Date("2026-08-10T00:00:00Z"));

    expect(results?.results.map(({ topicId }) => topicId)).toEqual(["topic-2", "topic-1", "topic-3"]);
  });
});
