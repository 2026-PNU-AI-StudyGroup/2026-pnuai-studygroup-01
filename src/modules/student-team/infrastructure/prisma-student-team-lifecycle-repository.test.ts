import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaStudentTeamCommandRepository } from "@/modules/student-team/infrastructure/prisma-student-team-command-repository";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";

describe("지속형 팀 수명주기 저장소", () => {
  it("팀장 이전 전에 부모 팀을 잠가 팀 구성 변경을 직렬화한다", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ id: "team-1" }]);
    const transaction = {
      $queryRaw: queryRaw,
      studentTeamMember: {
        findUnique: vi.fn(async () => ({ id: "member-2" })),
        updateMany: vi.fn(async () => ({ count: 1 })),
        update: vi.fn(async () => ({ id: "member-2" })),
      },
      studentTeam: { update: vi.fn(async () => ({ id: "team-1" })) },
    };
    const client = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaStudentTeamCommandRepository(client).transferLeadership({
      teamId: "team-1",
      leaderId: "student-1",
      nextLeaderId: "student-2",
    })).resolves.toBe(true);

    const sql = (queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join("?");
    expect(sql).toContain('FROM "student_team"');
    expect(sql).toContain("FOR UPDATE");
  });

  it("팀원 제거 전에 부모 팀을 잠가 프로젝트 승인의 팀원 확정과 직렬화한다", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ id: "team-1" }]);
    const deleteMany = vi.fn(async () => ({ count: 1 }));
    const transaction = {
      $queryRaw: queryRaw,
      studentTeamMember: { deleteMany },
    };
    const client = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    } as unknown as PrismaClient;

    await expect(new PrismaStudentTeamCommandRepository(client).removeMember({
      teamId: "team-1",
      leaderId: "student-1",
      studentId: "student-2",
    })).resolves.toBe(true);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { teamId: "team-1", studentId: "student-2" },
    });
    const sql = (queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join("?");
    expect(sql).toContain('FROM "student_team"');
    expect(sql).toContain("FOR UPDATE");
  });

  it("팀 삭제 시 대기 중인 제안 승인 요청을 종료한다", async () => {
    const updateApprovals = vi.fn(async () => ({ count: 1 }));
    const transaction = {
      studentTeam: { updateMany: vi.fn(async () => ({ count: 1 })) },
      studentTeamInvitation: { updateMany: vi.fn(async () => ({ count: 0 })) },
      studentTeamRecruitmentPost: { updateMany: vi.fn(async () => ({ count: 0 })) },
      studentTeamRecruitmentApplication: { updateMany: vi.fn(async () => ({ count: 0 })) },
      topicApprovalRequest: { updateMany: updateApprovals },
    };
    const client = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    } as unknown as PrismaClient;
    const deletedAt = new Date("2026-07-27T00:00:00Z");

    await expect(new PrismaStudentTeamCommandRepository(client).delete({
      teamId: "team-1",
      leaderId: "student-1",
      deletedAt,
    })).resolves.toBe(true);

    expect(updateApprovals).toHaveBeenCalledWith({
      where: { studentTeamId: "team-1", status: "PENDING" },
      data: {
        status: "REJECTED",
        reviewComment: "팀 삭제로 승인 요청이 자동 종료되었습니다.",
        decidedAt: deletedAt,
      },
    });
  });

  it("팀장 이전 후 모집 글을 현재 팀장 기준으로 조회한다", async () => {
    const count = vi.fn(async () => 0);
    const findMany = vi.fn(async () => []);
    const client = {
      studentTeamRecruitmentPost: { count, findMany },
    } as unknown as PrismaClient;

    await new PrismaStudentTeamRecruitmentQueryRepository(client)
      .listAuthoredPosts("student-2", 1);

    const where = { team: { leaderId: "student-2", deletedAt: null } };
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  });
});
