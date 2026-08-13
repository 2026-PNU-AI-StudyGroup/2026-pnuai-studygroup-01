import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaStudentTeamRecruitmentCommandRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-command-repository";

describe("PrismaStudentTeamRecruitmentCommandRepository", () => {
  it("모집 지원 수락 시 지원자의 활성 학생 상태를 저장소 경계에서 다시 확인한다", async () => {
    const queryRaw = vi.fn(async (query: unknown) => {
      void query;
      return [];
    });
    const client = {
      $transaction: vi.fn(async (operation) => operation({ $queryRaw: queryRaw })),
    } as unknown as PrismaClient;

    await expect(new PrismaStudentTeamRecruitmentCommandRepository(client).decide({
      applicationId: "application-1",
      actorId: "leader-1",
      isAdmin: false,
      decision: "ACCEPT",
      decidedAt: new Date("2026-08-13T00:00:00Z"),
    })).resolves.toBe("UNAVAILABLE");

    const sql = (queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join("?");
    expect(sql).toContain('JOIN "user" applicant');
    expect(sql).toContain('applicant."role" = \'STUDENT\'');
    expect(sql).toContain('applicant."accountStatus" = \'ACTIVE\'');
  });
});
