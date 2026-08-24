import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectTeamMembershipRepository } from "@/modules/project-team/infrastructure/prisma-project-team-membership-repository";

const changedAt = new Date("2026-08-14T00:00:00Z");
const leader = { id: "leader-membership", userId: "leader-1", role: "LEADER" as const };
const member = { id: "member-membership", userId: "member-1", role: "MEMBER" as const };

function client({
  canSupervise = true,
  confirmedAt = new Date("2026-08-01T00:00:00Z") as Date | null,
  actorMembership = null as { role: "LEADER" | "MEMBER" } | null,
  next = member as typeof member | null,
}: {
  canSupervise?: boolean;
  confirmedAt?: Date | null;
  actorMembership?: { role: "LEADER" | "MEMBER" } | null;
  next?: typeof member | null;
} = {}) {
  const queryRaw = vi.fn(async (query: unknown) => {
    void query;
    return [{
      id: "team-1",
      projectId: "project-1",
      status: "ACTIVE",
      confirmedAt,
      programEndsAt: new Date("2026-12-31T00:00:00Z"),
      canSupervise,
    }];
  });
  const findFirst = vi.fn(async ({ where }: { where: { userId?: string } }) => {
    if (where.userId === "leader-1") return leader;
    if (where.userId === "member-1") return next;
    if (where.userId === "actor-1") return actorMembership;
    return null;
  });
  const update = vi.fn(async () => ({}));
  const create = vi.fn(async () => ({}));
  const notificationCreate = vi.fn(async () => ({}));
  const transaction = {
    $queryRaw: queryRaw,
    projectTeamMembership: { findFirst, update },
    auditLog: { create },
    notification: { create: notificationCreate, createMany: notificationCreate },
    user: { findMany: vi.fn(async () => []) },
    emailDelivery: { createMany: vi.fn(async () => ({ count: 0 })) },
  };
  return {
    value: {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => unknown) => operation(transaction)),
    } as unknown as PrismaClient,
    queryRaw,
    findFirst,
    update,
    create,
  };
}

describe("PrismaProjectTeamMembershipRepository", () => {
  it("감독자가 팀장을 인계하고 제외할 때 두 변경과 감사 기록을 함께 저장한다", async () => {
    const db = client();
    const repository = new PrismaProjectTeamMembershipRepository(db.value);

    await expect(repository.removeLeaderAndTransfer({
      projectTeamId: "team-1",
      targetUserId: "leader-1",
      nextLeaderId: "member-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      changedAt,
    })).resolves.toBe("UPDATED");

    expect(db.update).toHaveBeenNthCalledWith(1, {
      where: { id: "leader-membership" },
      data: { endedAt: changedAt, endReason: "REMOVED" },
    });
    expect(db.update).toHaveBeenNthCalledWith(2, {
      where: { id: "member-membership" },
      data: { role: "LEADER" },
    });
    expect(db.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        action: "PROJECT_TEAM_LEADERSHIP_TRANSFERRED",
        metadata: expect.objectContaining({ previousLeaderId: "leader-1", nextLeaderId: "member-1" }),
      }),
    }));
    expect(db.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ action: "PROJECT_TEAM_MEMBER_REMOVED", targetId: "leader-membership" }),
    }));
    const sql = (db.queryRaw.mock.calls[0][0] as { strings: readonly string[] }).strings.join("?");
    expect(sql).toContain('FOR UPDATE OF "project_team", "topic"');
    const userLockSql = (db.queryRaw.mock.calls[1][0] as { strings: readonly string[] }).strings.join("?");
    expect(userLockSql).toContain('FROM "user"');
    expect(userLockSql).toContain("FOR UPDATE");
  });

  it("현재 팀장은 인계 후 본인을 탈퇴 처리한다", async () => {
    const db = client({ canSupervise: false, actorMembership: { role: "LEADER" } });
    const repository = new PrismaProjectTeamMembershipRepository(db.value);

    await expect(repository.removeLeaderAndTransfer({
      projectTeamId: "team-1",
      targetUserId: "leader-1",
      nextLeaderId: "member-1",
      actor: { id: "leader-1", role: "STUDENT" },
      changedAt,
    })).resolves.toBe("UPDATED");

    expect(db.update).toHaveBeenNthCalledWith(1, {
      where: { id: "leader-membership" },
      data: { endedAt: changedAt, endReason: "LEFT" },
    });
    expect(db.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ action: "PROJECT_TEAM_MEMBER_LEFT" }),
    }));
  });

  it("권한 없는 사용자는 팀장과 구성원을 변경할 수 없다", async () => {
    const db = client({ canSupervise: false });
    const repository = new PrismaProjectTeamMembershipRepository(db.value);

    await expect(repository.removeLeaderAndTransfer({
      projectTeamId: "team-1",
      targetUserId: "leader-1",
      nextLeaderId: "member-1",
      actor: { id: "actor-1", role: "STUDENT" },
      changedAt,
    })).resolves.toBe("FORBIDDEN");

    expect(db.update).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });

  it("활성 일반 팀원이 아닌 인계 대상은 변경하지 않는다", async () => {
    const db = client({ next: null });
    const repository = new PrismaProjectTeamMembershipRepository(db.value);

    await expect(repository.removeLeaderAndTransfer({
      projectTeamId: "team-1",
      targetUserId: "leader-1",
      nextLeaderId: "member-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      changedAt,
    })).resolves.toBe("CONFLICT");

    expect(db.update).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });

  it("확정되지 않은 팀에서는 구성원을 변경하지 않는다", async () => {
    const db = client({ confirmedAt: null });
    const repository = new PrismaProjectTeamMembershipRepository(db.value);

    await expect(repository.removeLeaderAndTransfer({
      projectTeamId: "team-1",
      targetUserId: "leader-1",
      nextLeaderId: "member-1",
      actor: { id: "professor-1", role: "PROFESSOR" },
      changedAt,
    })).resolves.toBe("NOT_ACTIVE");

    expect(db.findFirst).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });
});
