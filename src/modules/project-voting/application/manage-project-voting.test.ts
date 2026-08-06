import { describe, expect, it, vi } from "vitest";

import {
  ProjectVotingOperationError,
  ProjectVotingService,
  type ProjectVotingRepository,
} from "@/modules/project-voting/application/manage-project-voting";
import { ProjectVotingPolicyError } from "@/modules/project-voting/domain/project-voting-policy";

const now = new Date("2026-08-07T03:00:00.000Z");
const ballot = {
  programId: "program-1",
  programName: "캡스톤",
  policy: {
    startsAt: new Date("2026-08-01T00:00:00.000Z"),
    endsAt: new Date("2026-08-30T00:00:00.000Z"),
    voteLimit: 2,
    selfVotingAllowed: false,
    identityVisibility: "ANONYMOUS" as const,
  },
  phase: "OPEN" as const,
  candidates: [],
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

  it("저장소의 자기 프로젝트 차단 결과를 사용자 오류로 전달한다", async () => {
    const value = repository({ replaceVotes: vi.fn(async () => "SELF_VOTE_FORBIDDEN" as const) });
    await expect(new ProjectVotingService(value, () => now).saveVotes(
      { id: "voter-1", role: "ADMIN", name: "관리자", email: "admin@example.com", image: null },
      "program-1",
      ["topic-1"],
    )).rejects.toThrow(new ProjectVotingOperationError("자기 프로젝트에는 투표할 수 없습니다."));
  });

  it("관리자만 득표현황을 조회한다", async () => {
    const value = repository();
    await expect(new ProjectVotingService(value, () => now).getResults({ id: "student-1", role: "STUDENT" }, "program-1"))
      .rejects.toThrow(new ProjectVotingOperationError("관리자만 득표현황을 볼 수 있습니다."));
    expect(value.findResults).not.toHaveBeenCalled();
  });
});
