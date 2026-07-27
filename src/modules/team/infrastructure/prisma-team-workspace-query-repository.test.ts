import { describe, expect, it, vi } from "vitest";

import { PrismaTeamWorkspaceQueryRepository } from "@/modules/team/infrastructure/prisma-team-workspace-query-repository";

describe("PrismaTeamWorkspaceQueryRepository", () => {
  it("프로젝트 목록의 보고서 제출 수를 제출 버전이 있는 요구사항 단위로 집계한다", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "team-1",
        name: "모두의 길",
        status: "CONFIRMED",
        topic: { title: "실내 길찾기" },
        members: [{ id: "member-1" }],
        milestones: [],
        reports: [
          { versions: [{ id: "version-1" }] },
          { versions: [] },
          { versions: [{ id: "version-3" }] },
        ],
      },
    ]);
    const repository = new PrismaTeamWorkspaceQueryRepository({
      team: { findMany },
    } as never);

    const teams = await repository.listAll();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        reports: {
          select: {
            versions: {
              take: 1,
              select: { id: true },
            },
          },
        },
      }),
    }));
    expect(teams[0]).toEqual(expect.objectContaining({
      reportCount: 3,
      submittedReportCount: 2,
    }));
  });
});
