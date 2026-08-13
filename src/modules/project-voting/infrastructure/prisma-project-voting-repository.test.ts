import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";

type ResultTopic = {
  id: string;
  title: string;
  description: string;
  projectTeam: { name: string } | null;
  divisionId: string | null;
  division: { name: string; position: number } | null;
  _count: { votes: number };
};

function client(topics: ResultTopic[] = [{
  id: "topic-1",
  title: "프로젝트",
  description: "설명",
  projectTeam: { name: "알파팀" },
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
        },
      }),
    },
    topic: {
      findMany: vi.fn().mockResolvedValue(topics),
    },
    projectVote: {
      count: vi.fn().mockResolvedValue(1),
      groupBy: vi.fn().mockResolvedValue([{ voterId: "voter-1" }]),
      findMany: vi.fn().mockResolvedValue([{ topicId: "topic-1", voter: { id: "voter-1", name: "김학생", email: "student@example.com", role: "STUDENT" } }]),
    },
  } as unknown as PrismaClient;
}

describe("PrismaProjectVotingRepository 결과 조회", () => {
  it("비공개 프로그램의 투표 용지를 제공하지 않는다", async () => {
    const value = client();
    value.projectProgram.findUnique = vi.fn().mockResolvedValue({
      id: "program-1",
      name: "캡스톤",
      isStudentPublic: false,
      isFacultyPublic: false,
      endsAt: new Date("2026-12-31T00:00:00Z"),
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
      },
    });

    await expect(new PrismaProjectVotingRepository(value).findBallot("program-1", "voter-1", "STUDENT", new Date("2026-08-10T00:00:00Z"))).resolves.toBeNull();
    expect(value.topic.findMany).not.toHaveBeenCalled();
  });

  it("운영 종료 프로그램도 공개 상태이고 투표 기간이면 실시간 득표와 함께 투표 용지를 제공한다", async () => {
    const value = client();
    value.projectProgram.findUnique = vi.fn().mockResolvedValue({
      id: "program-1",
      name: "지난 캡스톤",
      isStudentPublic: true,
      isFacultyPublic: true,
      endsAt: new Date("2026-07-31T00:00:00Z"),
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
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
      projectTeam: { memberships: [] },
    }]);
    value.projectVote.findMany = vi.fn().mockResolvedValue([]);
    value.projectVote.groupBy = vi.fn().mockResolvedValue([{ topicId: "topic-1", _count: { topicId: 4 } }]);

    const ballot = await new PrismaProjectVotingRepository(value).findBallot(
      "program-1",
      "voter-1",
      "STUDENT",
      new Date("2026-08-10T00:00:00Z"),
    );

    expect(ballot?.phase).toBe("OPEN");
    expect(ballot?.candidates[0].voteCount).toBe(4);
  });

  it("교수진에만 공개된 프로그램은 교수에게 투표 용지를 제공한다", async () => {
    const value = client();
    value.projectProgram.findUnique = vi.fn().mockResolvedValue({
      id: "program-1",
      name: "교수진 프로그램",
      isStudentPublic: false,
      isFacultyPublic: true,
      votingPolicy: {
        startsAt: new Date("2026-08-01T00:00:00Z"),
        endsAt: new Date("2026-08-31T00:00:00Z"),
        voteLimit: 3,
        voteLimitScope: "PROGRAM",
        selfVotingAllowed: false,
      },
    });
    value.topic.findMany = vi.fn().mockResolvedValue([]);
    value.projectVote.findMany = vi.fn().mockResolvedValue([]);
    value.projectVote.groupBy = vi.fn().mockResolvedValue([]);

    await expect(new PrismaProjectVotingRepository(value).findBallot(
      "program-1",
      "professor-1",
      "PROFESSOR",
      new Date("2026-08-10T00:00:00Z"),
    )).resolves.toEqual(expect.objectContaining({ programId: "program-1" }));
  });

  it("투표자 이름, 이메일과 역할을 프로젝트별 결과에 연결한다", async () => {
    const value = client();
    value.projectVote.findMany = vi.fn().mockResolvedValue([
      { topicId: "topic-1", voter: { id: "voter-2", name: "이학생", email: "second@example.com", role: "PROFESSOR" } },
      { topicId: "topic-1", voter: { id: "voter-1", name: "김학생", email: "student@example.com", role: "STUDENT" } },
    ]);

    const results = await new PrismaProjectVotingRepository(value).findResults("program-1", new Date("2026-08-10T00:00:00Z"));

    expect(value.projectVote.findMany).toHaveBeenCalledWith({
      where: { programId: "program-1" },
      select: { topicId: true, voter: { select: { id: true, name: true, email: true, role: true } } },
    });
    expect(results?.results[0].teamName).toBe("알파팀");
    expect(results?.results[0].voters).toEqual([
      { id: "voter-1", name: "김학생", email: "student@example.com", role: "STUDENT" },
      { id: "voter-2", name: "이학생", email: "second@example.com", role: "PROFESSOR" },
    ]);
  });

  it("분과별 결과와 투표 진행 순서를 설정된 분과 순서대로 반환한다", async () => {
    const value = client([
      { id: "topic-1", title: "가나다", description: "", projectTeam: { name: "가팀" }, divisionId: "division-2", division: { name: "융합", position: 1 }, _count: { votes: 3 } },
      { id: "topic-2", title: "라마바사", description: "", projectTeam: { name: "나팀" }, divisionId: "division-1", division: { name: "창업", position: 0 }, _count: { votes: 1 } },
      { id: "topic-3", title: "사아", description: "", projectTeam: null, divisionId: null, division: null, _count: { votes: 9 } },
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
      },
    });

    const results = await new PrismaProjectVotingRepository(value).findResults("program-1", new Date("2026-08-10T00:00:00Z"));

    expect(results?.results.map(({ topicId }) => topicId)).toEqual(["topic-2", "topic-1", "topic-3"]);
  });
});
