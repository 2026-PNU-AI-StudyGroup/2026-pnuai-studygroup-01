import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { programReportMatrix } from "@/modules/report/infrastructure/prisma-program-report-matrix-query";

describe("programReportMatrix", () => {
  it("팀마다 보고서 칸에 마지막 버전의 상태를 적는다", async () => {
    const now = new Date("2026-10-26T00:00:00.000Z");
    const definitions = [
      { id: "mid", title: "중간 보고서", dueAt: new Date("2026-10-01T00:00:00.000Z"), required: true },
      { id: "final", title: "최종 보고서", dueAt: new Date("2026-12-01T00:00:00.000Z"), required: true },
    ];
    const teams = [{
      id: "team-1",
      name: "모두의 길",
      project: { id: "topic-1", title: "실내 길찾기" },
      reports: [
        { definitionId: "mid", dueAt: definitions[0].dueAt, versions: [{ decision: { decision: "REVISION_REQUESTED" } }] },
        { definitionId: "final", dueAt: definitions[1].dueAt, versions: [] },
      ],
    }, {
      id: "team-2",
      name: "늦은 팀",
      project: { id: "topic-2", title: "혼잡도 예측" },
      reports: [
        { definitionId: "mid", dueAt: definitions[0].dueAt, versions: [] },
        { definitionId: "final", dueAt: definitions[1].dueAt, versions: [{ decision: null }] },
      ],
    }];
    const client = {
      programReportDefinition: { findMany: vi.fn(async () => definitions) },
      projectTeam: { findMany: vi.fn(async () => teams) },
    } as unknown as PrismaClient;

    const matrix = await programReportMatrix(client, "program-1", now);

    expect(matrix.columns.map(({ id }) => id)).toEqual(["mid", "final"]);
    expect(matrix.rows).toEqual([
      expect.objectContaining({ projectTitle: "실내 길찾기", cells: { mid: "REVISION_REQUESTED", final: "NOT_SUBMITTED" } }),
      expect.objectContaining({ projectTitle: "혼잡도 예측", cells: { mid: "OVERDUE", final: "PENDING_REVIEW" } }),
    ]);
  });
});
