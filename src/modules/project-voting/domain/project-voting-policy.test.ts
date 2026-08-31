import { describe, expect, it } from "vitest";

import {
  canShowPopularAward,
  isOwnProject,
  pickPopularAwardTopicIds,
} from "@/modules/project-voting/domain/project-voting-policy";

const base = { authorId: "student-1", managerId: null as string | null, assistantCount: 0, memberCount: 0 };

describe("isOwnProject", () => {
  it("등록자 본인은 당사자다", () => {
    expect(isOwnProject(base, { id: "student-1", role: "STUDENT" })).toBe(true);
  });

  it("팀원과 조교는 당사자다", () => {
    expect(isOwnProject({ ...base, memberCount: 1 }, { id: "student-2", role: "STUDENT" })).toBe(true);
    expect(isOwnProject({ ...base, assistantCount: 1 }, { id: "prof-1", role: "PROFESSOR" })).toBe(true);
  });

  it("지도교수는 담당 프로젝트의 당사자다", () => {
    expect(isOwnProject({ ...base, managerId: "prof-1" }, { id: "prof-1", role: "PROFESSOR" })).toBe(true);
  });

  it("관리자는 어느 자리에 있어도 당사자가 아니다", () => {
    // 학생 등록 프로젝트를 관리자 경로로 승인하면 승인한 관리자가 managerId 로 박힌다.
    // 그걸 당사자로 보면 자기가 승인한 프로젝트 전부에 투표할 수 없게 된다.
    expect(isOwnProject({ ...base, managerId: "admin-1" }, { id: "admin-1", role: "ADMIN" })).toBe(false);
    // 심사하는 자리라 본인이 속한 팀에도 투표할 수 있다.
    expect(isOwnProject({ ...base, managerId: "admin-1", memberCount: 1 }, { id: "admin-1", role: "ADMIN" })).toBe(false);
    expect(isOwnProject({ ...base, authorId: "admin-1" }, { id: "admin-1", role: "ADMIN" })).toBe(false);
  });

  it("아무 관계도 없으면 당사자가 아니다", () => {
    expect(isOwnProject({ ...base, managerId: "prof-1" }, { id: "other-1", role: "STUDENT" })).toBe(false);
  });
});

describe("canShowPopularAward", () => {
  const policy = {
    startsAt: new Date("2026-08-27T04:00:00Z"),
    endsAt: new Date("2026-08-28T07:00:00Z"),
    voteLimit: 2,
    selfVotingAllowed: false,
    resultsVisibleDuringVoting: true,
    resultsVisibleAfterVoting: true,
  };

  it("투표가 끝나고 결과를 공개하는 프로그램에서만 붙인다", () => {
    expect(canShowPopularAward(policy, new Date("2026-08-29T00:00:00Z"))).toBe(true);
  });

  it("투표 전과 투표 중에는 붙이지 않는다", () => {
    expect(canShowPopularAward(policy, new Date("2026-08-26T00:00:00Z"))).toBe(false);
    // 진행 중 득표를 공개하더라도 상 이름은 끝난 뒤에 붙는다. 순위를 보고 표를 몰아 주게 된다.
    expect(canShowPopularAward(policy, new Date("2026-08-27T10:00:00Z"))).toBe(false);
  });

  it("결과를 공개하지 않기로 했으면 끝나도 붙이지 않는다", () => {
    expect(canShowPopularAward({ ...policy, resultsVisibleAfterVoting: false }, new Date("2026-08-29T00:00:00Z"))).toBe(false);
  });
});

describe("pickPopularAwardTopicIds", () => {
  it("득표 상위 두 팀을 고른다", () => {
    const picked = pickPopularAwardTopicIds([
      { topicId: "a", votes: 12 },
      { topicId: "b", votes: 49 },
      { topicId: "c", votes: 42 },
    ]);
    expect([...picked].sort()).toEqual(["b", "c"]);
  });

  it("경계에서 표가 같으면 모두 넣는다", () => {
    // 같은 표를 받았는데 정원에 걸린다는 이유로 하나만 자르면 상을 임의로 뺏는 셈이다.
    const picked = pickPopularAwardTopicIds([
      { topicId: "a", votes: 49 },
      { topicId: "b", votes: 42 },
      { topicId: "c", votes: 42 },
    ]);
    expect([...picked].sort()).toEqual(["a", "b", "c"]);
  });

  it("한 표도 못 받은 팀은 넣지 않는다", () => {
    expect(pickPopularAwardTopicIds([{ topicId: "a", votes: 0 }, { topicId: "b", votes: 0 }]).size).toBe(0);
    expect([...pickPopularAwardTopicIds([{ topicId: "a", votes: 3 }, { topicId: "b", votes: 0 }])]).toEqual(["a"]);
  });

  it("후보가 정원보다 적어도 있는 만큼만 고른다", () => {
    expect([...pickPopularAwardTopicIds([{ topicId: "a", votes: 5 }])]).toEqual(["a"]);
    expect(pickPopularAwardTopicIds([]).size).toBe(0);
  });
});
