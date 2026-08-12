import { describe, expect, it, vi } from "vitest";

import {
  ReportDecisionService,
  ReportOperationNotAllowedError,
  ReportSubmissionService,
} from "@/modules/report/application/manage-reports";
import type {
  ReportDecisionWriter,
  ReportSubmissionWriter,
} from "@/modules/report/application/report-ports";

function writers() {
  const submissions: ReportSubmissionWriter = {
    submit: vi.fn(async () => ({ reportId: "report-1", version: 1 })),
  };
  const decisions: ReportDecisionWriter = {
    decide: vi.fn(async () => true),
  };
  return { submissions, decisions };
}

describe("보고서 관리", () => {
  it("학생 제출을 정규화해 버전 생성 포트로 전달한다", async () => {
    const dependencies = writers();
    const service = new ReportSubmissionService(dependencies.submissions);
    const now = new Date("2026-07-14T00:00:00Z");

    await service.submit(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", reportId: "report-1", fileId: "file-1", description: "  1차 제출  " },
      now,
    );

    expect(dependencies.submissions.submit).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      reportId: "report-1",
      fileId: "file-1",
      description: "1차 제출",
      submittedAt: now,
    });
  });

  it("감독 권한이 없는 사용자의 승인 결정을 저장소 경계에서 거부한다", async () => {
    const dependencies = writers();
    vi.mocked(dependencies.decisions.decide).mockResolvedValue(false);
    await expect(
      new ReportDecisionService(dependencies.decisions).decide(
        { id: "student-1", role: "STUDENT" },
        { reportVersionId: "version-1", decision: "APPROVED", comment: "" },
      ),
    ).rejects.toBeInstanceOf(ReportOperationNotAllowedError);
    expect(dependencies.decisions.decide).toHaveBeenCalledOnce();
  });

});
