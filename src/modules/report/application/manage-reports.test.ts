import { describe, expect, it, vi } from "vitest";

import {
  ReportOperationNotAllowedError,
  ReportService,
} from "@/modules/report/application/manage-reports";
import type { ReportRepository } from "@/modules/report/application/report-ports";

function repository(): ReportRepository {
  return {
    findWorkspace: vi.fn(),
    setRequirement: vi.fn(async () => ({ id: "report-1" })),
    removeRequirement: vi.fn(async () => true),
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

  it("교수의 보고서 요구사항 설정을 지도 범위 포트로 전달한다", async () => {
    const repo = repository();
    const service = new ReportService(repo);
    const now = new Date("2026-07-17T00:00:00Z");
    const dueAt = new Date("2026-08-31T14:59:00Z");

    await service.setRequirement(
      { id: "professor-1", role: "PROFESSOR" },
      { teamId: "team-1", type: "MIDTERM", dueAt },
      now,
    );

    expect(repo.setRequirement).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      type: "MIDTERM",
      dueAt,
      configuredAt: now,
    });
  });

  it("학생의 보고서 요구사항 변경을 영속화 전에 거부한다", async () => {
    const repo = repository();
    await expect(new ReportService(repo).removeRequirement(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", type: "START" },
    )).rejects.toBeInstanceOf(ReportOperationNotAllowedError);
    expect(repo.removeRequirement).not.toHaveBeenCalled();
  });
});
