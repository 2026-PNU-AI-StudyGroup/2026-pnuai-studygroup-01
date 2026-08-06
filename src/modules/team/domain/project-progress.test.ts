import { describe, expect, it } from "vitest";

import {
  calculateReportSubmissionRate,
  classifyProjectProgress,
  classifyProjectProgressBand,
  hasReportSchedule,
  isReportSubmissionOverdue,
} from "@/modules/team/domain/project-progress";

describe("프로젝트 진행률", () => {
  it("보고서 제출률을 프로젝트 진행 지표로 계산한다", () => {
    expect(calculateReportSubmissionRate(1, 3)).toBe(33);
    expect(calculateReportSubmissionRate(3, 3)).toBe(100);
  });

  it("진행률을 표시할 보고서 일정의 존재 여부를 구분한다", () => {
    expect(hasReportSchedule(0)).toBe(false);
    expect(hasReportSchedule(-1)).toBe(false);
    expect(hasReportSchedule(1)).toBe(true);
  });

  it("진행률을 시작 전, 진행 중, 완료 구간으로 분류한다", () => {
    expect(classifyProjectProgress(0)).toBe("NOT_STARTED");
    expect(classifyProjectProgress(33)).toBe("IN_PROGRESS");
    expect(classifyProjectProgress(100)).toBe("COMPLETED");
  });

  it("관리 통계를 위해 진행률을 세부 구간으로 분류한다", () => {
    expect(classifyProjectProgressBand(0)).toBe("NOT_STARTED");
    expect(classifyProjectProgressBand(1)).toBe("EARLY");
    expect(classifyProjectProgressBand(25)).toBe("EARLY");
    expect(classifyProjectProgressBand(26)).toBe("MIDDLE");
    expect(classifyProjectProgressBand(50)).toBe("MIDDLE");
    expect(classifyProjectProgressBand(51)).toBe("LATE");
    expect(classifyProjectProgressBand(75)).toBe("LATE");
    expect(classifyProjectProgressBand(76)).toBe("FINALIZING");
    expect(classifyProjectProgressBand(99)).toBe("FINALIZING");
    expect(classifyProjectProgressBand(100)).toBe("COMPLETED");
  });

  it("마감 시각이 지났지만 제출 이력이 없는 보고서만 기한 초과로 판단한다", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");

    expect(isReportSubmissionOverdue(new Date("2026-07-27T11:59:59.000Z"), false, now)).toBe(true);
    expect(isReportSubmissionOverdue(new Date("2026-07-27T11:59:59.000Z"), true, now)).toBe(false);
    expect(isReportSubmissionOverdue(now, false, now)).toBe(false);
    expect(isReportSubmissionOverdue(new Date("2026-07-27T12:00:01.000Z"), false, now)).toBe(false);
  });
});
