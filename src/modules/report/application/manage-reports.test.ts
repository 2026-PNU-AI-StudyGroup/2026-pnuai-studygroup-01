import { describe, expect, it, vi } from "vitest";

import {
  ReportDecisionService,
  ReportOperationNotAllowedError,
  ReportRequirementService,
  ReportSubmissionService,
} from "@/modules/report/application/manage-reports";
import type {
  ReportDecisionWriter,
  ReportRequirementWriter,
  ReportSubmissionWriter,
} from "@/modules/report/application/report-ports";

function writers() {
  const requirements: ReportRequirementWriter = {
    setRequirement: vi.fn(async () => ({ id: "report-1" })),
    removeRequirement: vi.fn(async () => true),
  };
  const submissions: ReportSubmissionWriter = {
    submit: vi.fn(async () => ({ reportId: "report-1", version: 1 })),
  };
  const decisions: ReportDecisionWriter = {
    decide: vi.fn(async () => true),
  };
  return { requirements, submissions, decisions };
}

describe("보고서 관리", () => {
  it("학생 제출을 정규화해 버전 생성 포트로 전달한다", async () => {
    const dependencies = writers();
    const service = new ReportSubmissionService(dependencies.submissions);
    const now = new Date("2026-07-14T00:00:00Z");

    await service.submit(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", type: "MIDTERM", fileId: "file-1", description: "  1차 제출  " },
      now,
    );

    expect(dependencies.submissions.submit).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      type: "MIDTERM",
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

  it("교수의 보고서 요구사항 설정을 지도 범위 포트로 전달한다", async () => {
    const dependencies = writers();
    const service = new ReportRequirementService(dependencies.requirements);
    const now = new Date("2026-07-17T00:00:00Z");
    const dueAt = new Date("2026-08-31T14:59:00Z");

    await service.setRequirement(
      { id: "professor-1", role: "PROFESSOR" },
      { teamId: "team-1", type: "MIDTERM", dueAt },
      now,
    );

    expect(dependencies.requirements.setRequirement).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      type: "MIDTERM",
      dueAt,
      configuredAt: now,
    });
  });

  it("감독 권한이 없는 사용자의 보고서 요구사항 변경을 저장소 경계에서 거부한다", async () => {
    const dependencies = writers();
    vi.mocked(dependencies.requirements.removeRequirement).mockResolvedValue(false);
    await expect(new ReportRequirementService(dependencies.requirements).removeRequirement(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", type: "START" },
    )).rejects.toBeInstanceOf(ReportOperationNotAllowedError);
    expect(dependencies.requirements.removeRequirement).toHaveBeenCalledOnce();
  });
});
