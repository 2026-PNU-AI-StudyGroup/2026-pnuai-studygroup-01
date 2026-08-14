import { describe, expect, it, vi } from "vitest";

import {
  ProjectVotingOperationError,
  ProjectVotingService,
  type ProjectVotingRepository,
} from "@/modules/project-voting/application/manage-project-voting";
import { normalizeVoteSelection, ProjectVotingPolicyError } from "@/modules/project-voting/domain/project-voting-policy";

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
    identityVisibility: "ANONYMOUS" as const,
  },
  phase: "OPEN" as const,
  candidates: [
    { id: "topic-1", title: "프로젝트 1", description: "", divisionId: null, divisionName: null, isSelfProject: false, voteCount: 0 },
    { id: "topic-2", title: "프로젝트 2", description: "", divisionId: null, divisionName: null, isSelfProject: false, voteCount: 0 },
    { id: "topic-3", title: "프로젝트 3", description: "", divisionId: null, divisionName: null, isSelfProject: false, voteCount: 0 },
  ],
  selectedTopicIds: [],
};

function repository(overrides: Partial<ProjectVotingRepository> = {}): ProjectVotingRepository {
  return {
    findBallot: vi.fn(async () => ballot),
    replaceVotes: vi.fn(async () => "SAVED" as const),
    findResults: vi.fn(async () => null),
    ...overrides,
  };
}

describe("프로그램 프로젝트 투표", () => {
  it("중복 선택은 하나로 합쳐 최대 투표수 안에서 저장한다", async () => {
    const value = repository();
    await new ProjectVotingService(value, () => now).saveVotes(
      { id: "voter-1", role: "STUDENT", name: "학생", email: "student@example.com", image: null },
      "program-1",
      ["topic-1", "topic-1", "topic-2"],
    );
    expect(value.replaceVotes).toHaveBeenCalledWith(expect.objectContaining({ topicIds: ["topic-1", "topic-2"] }));
  });

  it("인당 가능 투표수를 넘기면 저장소 호출 전에 거절한다", async () => {
    const value = repository();
    await expect(new ProjectVotingService(value, () => now).saveVotes(
      { id: "voter-1", role: "STUDENT", name: "학생", email: "student@example.com", image: null },
      "program-1",
      ["topic-1", "topic-2", "topic-3"],
    )).rejects.toBeInstanceOf(ProjectVotingPolicyError);
    expect(value.replaceVotes).not.toHaveBeenCalled();
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
    const value = repository({ replaceVotes: vi.fn(async () => "SELF_VOTE_FORBIDDEN" as const) });
    await expect(new ProjectVotingService(value, () => now).saveVotes(
      { id: "voter-1", role: "ADMIN", name: "관리자", email: "admin@example.com", image: null },
      "program-1",
      ["topic-1"],
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
    const topicIds = (count: number) => Array.from({ length: count }, (_, index) => `topic-${index + 1}`);

    it.each(["ADVISOR", "ADMIN"] as const)("%s는 staffVoteLimit까지 저장한다", async (role) => {
      const value = staffRepository();
      await new ProjectVotingService(value, () => now).saveVotes(user(role), "program-1", topicIds(4));
      expect(value.replaceVotes).toHaveBeenCalledWith(expect.objectContaining({ topicIds: topicIds(4) }));
    });

    it("학생은 기존 voteLimit을 넘기면 거절한다", async () => {
      const value = staffRepository();
      await expect(new ProjectVotingService(value, () => now).saveVotes(user("STUDENT"), "program-1", topicIds(4)))
        .rejects.toBeInstanceOf(ProjectVotingPolicyError);
      expect(value.replaceVotes).not.toHaveBeenCalled();
    });

    it("자문위원도 staffVoteLimit을 넘기면 거절한다", async () => {
      const value = staffRepository();
      await expect(new ProjectVotingService(value, () => now).saveVotes(user("ADVISOR"), "program-1", topicIds(6)))
        .rejects.toBeInstanceOf(ProjectVotingPolicyError);
      expect(value.replaceVotes).not.toHaveBeenCalled();
    });

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
});
