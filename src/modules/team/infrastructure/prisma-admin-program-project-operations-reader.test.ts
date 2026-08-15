import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaAdminProgramProjectOperationsReader } from "@/modules/team/infrastructure/prisma-admin-program-project-operations-reader";

describe("PrismaAdminProgramProjectOperationsReader", () => {
  it("프로그램의 활성 프로젝트와 필수 보고서 제출 여부만 조회한다", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "topic-1", projectTeam: null },
      {
        id: "topic-2",
        projectTeam: {
          reports: [{ dueAt: new Date("2026-08-01T00:00:00Z"), versions: [{ id: "version-1" }] }],
        },
      },
    ]);
    const client = { topic: { findMany } } as unknown as PrismaClient;

    const result = await new PrismaAdminProgramProjectOperationsReader(client).listByProgram("program-1");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { programId: "program-1", status: "ACTIVE" },
      select: expect.objectContaining({ projectTeam: expect.any(Object) }),
    }));
    expect(result).toEqual([
      { topicId: "topic-1", team: null },
      {
        topicId: "topic-2",
        team: { reports: [{ dueAt: new Date("2026-08-01T00:00:00Z"), submitted: true }] },
      },
    ]);
  });
});
