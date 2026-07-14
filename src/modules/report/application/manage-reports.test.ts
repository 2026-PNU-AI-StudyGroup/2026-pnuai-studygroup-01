import { describe, expect, it, vi } from "vitest";

import {
  ReportOperationNotAllowedError,
  ReportService,
} from "@/modules/report/application/manage-reports";
import type { ReportRepository } from "@/modules/report/application/report-ports";

function repository(): ReportRepository {
  return {
    findWorkspace: vi.fn(),
    submit: vi.fn(async () => ({ reportId: "report-1", version: 1 })),
    decide: vi.fn(async () => true),
    registerArtifact: vi.fn(async () => ({ id: "artifact-1" })),
  };
}

describe("보고서 관리", () => {
  it("학생 제출을 정규화해 버전 생성 포트로 전달한다", async () => {
    const repo = repository();
    const service = new ReportService(repo);
    const now = new Date("2026-07-14T00:00:00Z");

    await service.submit(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", type: "MIDTERM", fileId: "file-1", description: "  1차 제출  " },
      now,
    );

    expect(repo.submit).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      type: "MIDTERM",
      fileId: "file-1",
      description: "1차 제출",
      submittedAt: now,
    });
  });

  it("학생의 승인 결정을 영속화 전에 거부한다", async () => {
    const repo = repository();
    await expect(
      new ReportService(repo).decide(
        { id: "student-1", role: "STUDENT" },
        { reportVersionId: "version-1", decision: "APPROVED", comment: "" },
      ),
    ).rejects.toBeInstanceOf(ReportOperationNotAllowedError);
    expect(repo.decide).not.toHaveBeenCalled();
  });
});
