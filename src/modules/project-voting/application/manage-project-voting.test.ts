import { describe, expect, it, vi } from "vitest";

import {
  ProjectVotingOperationError,
  ProjectVotingService,
  type ProjectVotingRepository,
  type SavedProgramVote,
} from "@/modules/project-voting/application/manage-project-voting";
import {
  canViewPublicVotingResults,
  normalizeVoteSelection,
  ProjectVotingPolicyError,
} from "@/modules/project-voting/domain/project-voting-policy";

const now = new Date("2026-08-07T03:00:00.000Z");
const ballot = {
  programId: "program-1",
  programName: "캡스톤",
  policy: {
    startsAt: new Date("2026-08-01T00:00:00.000Z"),
    endsAt: new Date("2026-08-30T00:00:00.000Z"),
    voteLimit: 2,
    staffVoteLimit: 5,
    voteLimitScope: "PROGRAM" as const,
    selfVotingAllowed: false,
    resultsVisibleDuringVoting: false,
    resultsVisibleAfterVoting: true,
  },
  phase: "OPEN" as const,
  candidates: [
    { id: "topic-1", title: "프로젝트 1", description: "", divisionId: null, divisionName: null, isSelfProject: false, voteCount: 0 },
    { id: "topic-2", title: "프로젝트 2", description: "", divisionId: null, divisionName: null, isSelfProject: false, voteCount: 0 },
    { id: "topic-3", title: "프로젝트 3", description: "", divisionId: null, divisionName: null, isSelfProject: false, voteCount: 0 },
  ],
  selectedTopicIds: [],
};

const savedOutcome: SavedProgramVote = {
  status: "SAVED",
  voted: true,
  selectedTopicIds: ["topic-1"],
  remainingVotes: 1,
  scope: { type: "PROGRAM", divisionName: null },
};

function repository(overrides: Partial<ProjectVotingRepository> = {}): ProjectVotingRepository {
  return {
    findBallot: vi.fn(async () => ballot),
    toggleVote: vi.fn(async () => savedOutcome),
    findResults: vi.fn(async () => null),
    findPublicResults: vi.fn(async () => null),
    ...overrides,
  };
}

const student = { id: "voter-1", role: "STUDENT" as const, name: "학생", email: "student@example.com", image: null };

describe("프로그램 프로젝트 투표", () => {
  it("뒤집을 표만 저장소에 넘긴다", async () => {
    // 다음 집합을 여기서 계산해 넘기면 그 계산의 근거가 트랜잭션 밖 읽기가 된다.
    // 탭 두 개로 연달아 투표할 때 먼저 저장된 표가 지워지므로 의도만 넘겨야 한다.
    const value = repository();
    await new ProjectVotingService(value, () => now).toggleVote(student, "program-1", "topic-2");
    expect(value.toggleVote).toHaveBeenCalledWith({
      programId: "program-1",
      voterId: "voter-1",
      topicId: "topic-2",
      votedAt: now,
    });
    expect(value.findBallot).not.toHaveBeenCalled();
  });

  it("한도 초과는 분과 이름을 붙여 알린다", async () => {
    const value = repository({
      toggleVote: vi.fn(async () => ({
        status: "VOTE_LIMIT_REACHED" as const,
        voteLimit: 2,
        scope: { type: "DIVISION" as const, divisionName: "창업" },
      })),
    });
    await expect(new ProjectVotingService(value, () => now).toggleVote(student, "program-1", "topic-2"))
      .rejects.toThrow(new ProjectVotingOperationError("창업 분과에서 가능한 2표를 모두 사용했습니다."));
  });

  it("분과 이름이 없으면 미분과로 알린다", async () => {
    const value = repository({
      toggleVote: vi.fn(async () => ({
        status: "VOTE_LIMIT_REACHED" as const,
        voteLimit: 1,
        scope: { type: "DIVISION" as const, divisionName: null },
      })),
    });
    await expect(new ProjectVotingService(value, () => now).toggleVote(student, "program-1", "topic-2"))
      .rejects.toThrow(new ProjectVotingOperationError("미분과 분과에서 가능한 1표를 모두 사용했습니다."));
  });

  it("분과별 투표는 분과마다 같은 한도를 적용하고 미분과를 별도 묶음으로 본다", () => {
    const policy = { ...ballot.policy, voteLimit: 1, voteLimitScope: "DIVISION" as const };
    const candidates = [
      { id: "startup-1", divisionId: "startup" },
      { id: "fusion-1", divisionId: "fusion" },
      { id: "unassigned-1", divisionId: null },
    ];
    expect(normalizeVoteSelection(["startup-1", "fusion-1", "unassigned-1"], policy, candidates))
      .toEqual(["startup-1", "fusion-1", "unassigned-1"]);
    expect(() => normalizeVoteSelection(["startup-1", "startup-2"], policy, [
      ...candidates,
      { id: "startup-2", divisionId: "startup" },
    ])).toThrow(ProjectVotingPolicyError);
  });

  it("저장소의 자기 프로젝트 차단 결과를 사용자 오류로 전달한다", async () => {
    const value = repository({ toggleVote: vi.fn(async () => ({ status: "SELF_VOTE_FORBIDDEN" as const })) });
    await expect(new ProjectVotingService(value, () => now).toggleVote(
      { id: "voter-1", role: "ADMIN", name: "관리자", email: "admin@example.com", image: null },
      "program-1",
      "topic-1",
    )).rejects.toThrow(new ProjectVotingOperationError("자기 프로젝트에는 투표할 수 없습니다."));
  });

  describe("자문위원·관리자 투표 한도", () => {
    const staffBallot = {
      ...ballot,
      policy: { ...ballot.policy, voteLimit: 3, staffVoteLimit: 5 },
      candidates: Array.from({ length: 6 }, (_, index) => ({
        id: `topic-${index + 1}`, title: `프로젝트 ${index + 1}`, description: "",
        divisionId: null, divisionName: null, isSelfProject: false, voteCount: 0,
      })),
    };
    const staffRepository = () => repository({ findBallot: vi.fn(async () => staffBallot) });
    const user = (role: "ADVISOR" | "ADMIN" | "STUDENT") => ({ id: "voter-1", role, name: "사용자", email: "user@example.com", image: null });

    // 한도 자체를 지키는 일은 저장소가 트랜잭션 안에서 한다(prisma-project-voting-repository.test.ts).
    // 여기서는 화면에 내려보내는 유효 한도만 확인한다.
    it("getBallot은 자문위원에게 staffVoteLimit을 유효 한도로 준다", async () => {
      const service = new ProjectVotingService(staffRepository(), () => now);
      expect((await service.getBallot(user("ADVISOR"), "program-1"))?.policy.voteLimit).toBe(5);
      expect((await service.getBallot(user("STUDENT"), "program-1"))?.policy.voteLimit).toBe(3);
    });
  });

  it("관리자만 득표현황을 조회한다", async () => {
    const value = repository();
    await expect(new ProjectVotingService(value, () => now).getResults({ id: "student-1", role: "STUDENT" }, "program-1"))
      .rejects.toThrow(new ProjectVotingOperationError("관리자만 득표현황을 볼 수 있습니다."));
    expect(value.findResults).not.toHaveBeenCalled();
  });

  it("학생과 교수의 공개 결과 조회는 개인정보 없는 공개 저장소 경로만 사용한다", async () => {
    const publicResults = {
      programId: "program-1",
      programName: "캡스톤",
      phase: "OPEN" as const,
      voteLimitScope: "PROGRAM" as const,
      totalVotes: 2,
      results: [],
    };
    const value = repository({ findPublicResults: vi.fn(async () => publicResults) });
    const service = new ProjectVotingService(value, () => now);

    await expect(service.getPublicResults({ id: "student-1", role: "STUDENT", name: "학생", email: "student@example.com", image: null }, "program-1"))
      .resolves.toBe(publicResults);
    expect(value.findPublicResults).toHaveBeenCalledWith("program-1", "STUDENT", now);
    expect(value.findResults).not.toHaveBeenCalled();
  });

  it("관리자는 공개 결과 경로 대신 상세 결과 경로를 사용한다", async () => {
    const value = repository();

    await expect(new ProjectVotingService(value, () => now).getPublicResults(
      { id: "admin-1", role: "ADMIN", name: "관리자", email: "admin@example.com", image: null },
      "program-1",
    )).rejects.toThrow("관리자는 상세 득표현황을 조회해 주세요.");
    expect(value.findPublicResults).not.toHaveBeenCalled();
  });
});

describe("투표 결과 공개 시점", () => {
  const policy = ballot.policy;

  it("시작 전에는 공개 설정과 무관하게 결과를 숨긴다", () => {
    expect(canViewPublicVotingResults(
      { ...policy, resultsVisibleDuringVoting: true, resultsVisibleAfterVoting: true },
      new Date("2026-07-31T23:59:59.999Z"),
    )).toBe(false);
  });

  it("시작 시각부터는 투표 중 공개 설정을 적용한다", () => {
    expect(canViewPublicVotingResults(policy, policy.startsAt)).toBe(false);
    expect(canViewPublicVotingResults({ ...policy, resultsVisibleDuringVoting: true }, policy.startsAt)).toBe(true);
  });

  it("종료 시각부터는 마감 후 공개 설정을 적용한다", () => {
    expect(canViewPublicVotingResults(policy, policy.endsAt)).toBe(true);
    expect(canViewPublicVotingResults({ ...policy, resultsVisibleAfterVoting: false }, policy.endsAt)).toBe(false);
  });
});
