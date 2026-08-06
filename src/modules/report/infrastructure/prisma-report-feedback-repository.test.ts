import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaReportFeedbackRepository } from "@/modules/report/infrastructure/prisma-report-feedback-repository";

describe("PrismaReportFeedbackRepository", () => {
  it("일반 팀원에게는 보고서 피드백 작성을 허용하지 않는다", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn();
    const repository = new PrismaReportFeedbackRepository({
      report: { findFirst },
      reportFeedback: { create },
    } as unknown as PrismaClient);

    const added = await repository.add({
      reportId: "report-1",
      actor: { id: "student-1", role: "STUDENT" },
      body: "학생이 작성한 피드백",
      createdAt: new Date("2026-08-06T00:00:00Z"),
    });

    expect(added).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "report-1",
        team: {
          OR: [
            { topic: { assistants: { some: { userId: "student-1" } } } },
          ],
        },
      },
      select: { id: true },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("담당 교수의 보고서 피드백을 저장한다", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "report-1" });
    const create = vi.fn().mockResolvedValue({ id: "feedback-1" });
    const repository = new PrismaReportFeedbackRepository({
      report: { findFirst },
      reportFeedback: { create },
    } as unknown as PrismaClient);
    const createdAt = new Date("2026-08-06T00:00:00Z");

    const added = await repository.add({
      reportId: "report-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      body: "검토 의견",
      createdAt,
    });

    expect(added).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "report-1",
        team: {
          OR: [
            { professorId: "professor-1" },
            { topic: { assistants: { some: { userId: "professor-1" } } } },
          ],
        },
      },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        reportId: "report-1",
        authorId: "professor-1",
        body: "검토 의견",
        createdAt,
      },
    });
  });
});
