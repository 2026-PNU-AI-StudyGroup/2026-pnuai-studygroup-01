import { describe, expect, it } from "vitest";

import {
  isReportSubmissionOpen,
  reportPresentationState,
  selectStudentReportFocus,
  type ReportItem,
} from "@/app/projects/[projectId]/_lib/report-page-presentation";

const now = new Date("2026-08-04T00:00:00Z");

function report({
  id,
  position = 0,
  dueAt,
  decision,
  submitted = decision !== undefined,
  required = true,
  submissionEnabled = true,
}: {
  id: string;
  position?: number;
  dueAt: string;
  decision?: "APPROVED" | "REVISION_REQUESTED" | null;
  submitted?: boolean;
  required?: boolean;
  submissionEnabled?: boolean;
}): ReportItem {
  return {
    id,
    title: id,
    position,
    required,
    submissionEnabled,
    dueAt: new Date(dueAt),
    feedback: [],
    versions: submitted
      ? [{
          id: `${id}-version`,
          version: 1,
          fileId: `${id}-file`,
          fileName: `${id}.pdf`,
          description: "",
          submittedAt: new Date("2026-08-01T00:00:00Z"),
          submitterName: "정하늘",
          decision: decision
            ? {
                decision,
                comment: "검토 의견",
                decidedAt: new Date("2026-08-02T00:00:00Z"),
                reviewerName: "김도윤",
              }
            : undefined,
        }]
      : [],
  };
}

describe("보고서 화면 표현 상태", () => {
  it("승인된 이른 보고서보다 수정 요청이 있는 보고서를 지금 할 일로 고른다", () => {
    const approved = report({ id: "start", position: 0, dueAt: "2026-08-31T00:00:00Z", decision: "APPROVED" });
    const revision = report({ id: "midterm", position: 1, dueAt: "2026-10-15T00:00:00Z", decision: "REVISION_REQUESTED" });

    expect(selectStudentReportFocus([approved, revision], now)).toEqual({ kind: "REVISION", report: revision });
  });

  it("승인된 보고서의 마감보다 이후라도 미제출 보고서를 우선한다", () => {
    const approved = report({ id: "start", position: 0, dueAt: "2026-08-31T00:00:00Z", decision: "APPROVED" });
    const unsubmitted = report({ id: "final", position: 2, dueAt: "2026-12-10T00:00:00Z", submitted: false });

    expect(selectStudentReportFocus([approved, unsubmitted], now)).toEqual({ kind: "SUBMIT", report: unsubmitted });
  });

  it("최신 버전에 결정이 없으면 과거 결정과 무관하게 검토 대기로 분류한다", () => {
    const pending = report({ id: "midterm", dueAt: "2026-10-15T00:00:00Z", decision: null });

    expect(reportPresentationState(pending)).toBe("PENDING_REVIEW");
    expect(selectStudentReportFocus([pending], now)?.kind).toBe("WAITING");
  });

  it("마감 시각까지는 제출 가능하고 그 이후에는 차단 상태를 고른다", () => {
    const unsubmitted = report({ id: "final", dueAt: "2026-08-04T00:00:00Z", submitted: false });

    expect(isReportSubmissionOpen(unsubmitted, now)).toBe(true);
    expect(selectStudentReportFocus([unsubmitted], now)?.kind).toBe("SUBMIT");
    expect(selectStudentReportFocus([unsubmitted], new Date("2026-08-04T00:00:00.001Z"))?.kind).toBe("SUBMIT_BLOCKED");
  });

  it("선택 제출 보고서는 제출할 수 있지만 필수 보고서 우선순위에는 넣지 않는다", () => {
    const optional = report({ id: "optional", dueAt: "2026-08-10T00:00:00Z", submitted: false, required: false });

    expect(isReportSubmissionOpen(optional, now)).toBe(true);
    expect(selectStudentReportFocus([optional], now)).toBeNull();
  });
});
