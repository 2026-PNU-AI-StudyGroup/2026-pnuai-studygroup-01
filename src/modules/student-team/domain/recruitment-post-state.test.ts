import { describe, expect, it } from "vitest";

import {
  acceptsRecruitmentDecision,
  actionableRecruitmentApplicationCount,
  recruitmentApplicationState,
  recruitmentPostState,
} from "@/modules/student-team/domain/recruitment-post-state";

const now = new Date("2026-08-29T00:00:00.000Z");
const open = { status: "OPEN", deadlineAt: new Date("2026-09-05T00:00:00.000Z") };
const lapsed = { status: "OPEN", deadlineAt: new Date("2026-08-22T00:00:00.000Z") };
const closed = { status: "CLOSED", deadlineAt: new Date("2026-09-05T00:00:00.000Z") };

describe("recruitmentPostState", () => {
  it("마감일이 남은 OPEN 공고만 열린 것으로 본다", () => {
    expect(recruitmentPostState(open, now)).toBe("OPEN");
  });

  it("컬럼이 OPEN 이어도 마감일이 지나면 닫힌 것으로 본다", () => {
    expect(recruitmentPostState(lapsed, now)).toBe("CLOSED");
  });

  it("마감일이 남아도 직접 닫은 공고는 닫힌 것으로 본다", () => {
    expect(recruitmentPostState(closed, now)).toBe("CLOSED");
  });

  it("마감 시각 자체는 닫힌 것으로 본다", () => {
    expect(recruitmentPostState({ status: "OPEN", deadlineAt: now }, now)).toBe("CLOSED");
  });
});

describe("recruitmentApplicationState", () => {
  it("열린 공고의 대기 지원은 그대로 대기다", () => {
    expect(recruitmentApplicationState("PENDING", open, now)).toBe("PENDING");
  });

  it("마감된 공고에 남은 대기 지원은 모집 종료다", () => {
    expect(recruitmentApplicationState("PENDING", lapsed, now)).toBe("CLOSED");
  });

  it("이미 결정된 지원은 공고 상태와 무관하게 유지한다", () => {
    expect(recruitmentApplicationState("ACCEPTED", lapsed, now)).toBe("ACCEPTED");
    expect(recruitmentApplicationState("REJECTED", lapsed, now)).toBe("REJECTED");
    expect(recruitmentApplicationState("WITHDRAWN", lapsed, now)).toBe("WITHDRAWN");
  });
});

describe("actionableRecruitmentApplicationCount", () => {
  it("열린 공고는 대기 수를 그대로 센다", () => {
    expect(actionableRecruitmentApplicationCount(open, 2, now)).toBe(2);
  });

  it("마감된 공고의 대기 지원은 대기로 세지 않는다", () => {
    expect(actionableRecruitmentApplicationCount(lapsed, 2, now)).toBe(0);
  });
});

describe("acceptsRecruitmentDecision", () => {
  it("마감된 공고에서는 수락·거절을 받지 않는다", () => {
    expect(acceptsRecruitmentDecision(open, now)).toBe(true);
    expect(acceptsRecruitmentDecision(lapsed, now)).toBe(false);
  });
});
