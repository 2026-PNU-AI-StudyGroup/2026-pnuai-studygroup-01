import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { assignProgramDeliverablesToTeam } from "@/modules/report/infrastructure/program-deliverable-assignment";

function transactionFor(input: {
  status?: "FORMING" | "CONFIRMED" | "CLOSED";
  divisionId?: string | null;
  rubricMode?: "INHERIT_COMMON" | "CUSTOM" | null;
  reports?: Array<{ id: string; title: string; dueAt: Date }>;
  rubrics?: Array<{ id: string }>;
}) {
  const reportCreateMany = vi.fn(async () => ({ count: input.reports?.length ?? 0 }));
  const evaluationCreateMany = vi.fn(async () => ({ count: input.rubrics?.length ?? 0 }));
  const tx = {
    team: {
      findUnique: vi.fn(async () => ({
        id: "team-1",
        programId: "program-1",
        status: input.status ?? "FORMING",
        topic: {
          divisionId: input.divisionId ?? null,
          division: input.divisionId
            ? { rubricMode: input.rubricMode ?? "INHERIT_COMMON" }
            : null,
        },
      })),
    },
    programReportDefinition: { findMany: vi.fn(async () => input.reports ?? []) },
    report: { createMany: reportCreateMany },
    rubricDefinition: { findMany: vi.fn(async () => input.rubrics ?? []) },
    teamRubricEvaluation: { createMany: evaluationCreateMany },
  } as unknown as Prisma.TransactionClient;
  return { tx, reportCreateMany, evaluationCreateMany };
}

describe("프로그램 산출물 팀 할당", () => {
  it("활성 보고서 전체와 공통 채점표 여러 개를 같은 팀에 할당한다", async () => {
    const assignedAt = new Date("2026-08-11T03:00:00Z");
    const dueAt = new Date("2026-09-01T09:00:00Z");
    const setup = transactionFor({
      divisionId: "division-1",
      rubricMode: "INHERIT_COMMON",
      reports: [
        { id: "report-definition-1", title: "설계 검토", dueAt },
        { id: "report-definition-2", title: "최종 산출물", dueAt },
      ],
      rubrics: [{ id: "common-rubric-1" }, { id: "common-rubric-2" }],
    });

    await assignProgramDeliverablesToTeam(setup.tx, "team-1", assignedAt);

    expect(setup.reportCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ teamId: "team-1", definitionId: "report-definition-1", titleSnapshot: "설계 검토", required: true }),
        expect.objectContaining({ teamId: "team-1", definitionId: "report-definition-2", titleSnapshot: "최종 산출물", required: true }),
      ],
      skipDuplicates: true,
    });
    expect(setup.evaluationCreateMany).toHaveBeenCalledWith({
      data: [
        { teamId: "team-1", rubricId: "common-rubric-1", createdAt: assignedAt },
        { teamId: "team-1", rubricId: "common-rubric-2", createdAt: assignedAt },
      ],
      skipDuplicates: true,
    });
    expect(setup.tx.rubricDefinition.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ programId: "program-1", divisionId: null }),
    }));
  });

  it("전용 모드 분과에는 공통표 대신 해당 분과 채점표만 할당한다", async () => {
    const setup = transactionFor({
      divisionId: "division-1",
      rubricMode: "CUSTOM",
      rubrics: [{ id: "division-rubric-1" }],
    });

    await assignProgramDeliverablesToTeam(setup.tx, "team-1", new Date("2026-08-11T03:00:00Z"));

    expect(setup.tx.rubricDefinition.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ programId: "program-1", divisionId: "division-1" }),
    }));
    expect(setup.evaluationCreateMany).toHaveBeenCalledTimes(1);
  });

  it("종료된 팀에는 새 요구사항을 할당하지 않는다", async () => {
    const setup = transactionFor({ status: "CLOSED", reports: [{ id: "definition-1", title: "보고서", dueAt: new Date() }], rubrics: [{ id: "rubric-1" }] });

    await assignProgramDeliverablesToTeam(setup.tx, "team-1", new Date());

    expect(setup.tx.programReportDefinition.findMany).not.toHaveBeenCalled();
    expect(setup.reportCreateMany).not.toHaveBeenCalled();
    expect(setup.evaluationCreateMany).not.toHaveBeenCalled();
  });
});
