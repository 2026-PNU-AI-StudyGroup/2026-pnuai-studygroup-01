import { describe, expect, it, vi } from "vitest";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaAdvisorAdminRepository } from "@/modules/advisor/infrastructure/prisma-advisor-admin-repository";

function uniqueConflict() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.8.0",
    meta: { target: ["email"] },
  });
}

const invite = { programId: "prog-1", name: "김위원", email: "advisor@example.com", actorId: "admin-1" };

// 초대는 user.create·초대행·감사로그를 한 트랜잭션에서 처리하므로 콜백을 그대로 실행하는 목을 쓴다.
function clientWithRacingCreate(racedUser: { id: string; role: string } | null) {
  const user = {
    findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(racedUser),
    create: vi.fn().mockRejectedValue(uniqueConflict()),
  };
  const auditLog = { create: vi.fn().mockResolvedValue({}) };
  const programAdvisorInvitation = { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() };
  return {
    user,
    auditLog,
    programAdvisorInvitation,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({ user, auditLog, programAdvisorInvitation })),
  } as unknown as PrismaClient;
}

function clientWithInvitation(existingInvitation: { id: string; revokedAt: Date | null } | null) {
  const user = { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "adv-9" }) };
  const auditLog = { create: vi.fn().mockResolvedValue({}) };
  const programAdvisorInvitation = {
    findUnique: vi.fn().mockResolvedValue(existingInvitation),
    create: vi.fn().mockResolvedValue({ id: "inv-9" }),
    update: vi.fn().mockResolvedValue({ id: existingInvitation?.id ?? "inv-9" }),
  };
  const client = {
    user,
    auditLog,
    programAdvisorInvitation,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({ user, auditLog, programAdvisorInvitation })),
  } as unknown as PrismaClient;
  return { client, user, auditLog, programAdvisorInvitation };
}

describe("PrismaAdvisorAdminRepository.inviteAdvisor", () => {
  it("동시 초대 레이스(P2002)로 create가 실패하면 재조회해 ADVISOR면 이미 초대된 것으로 본다", async () => {
    const repository = new PrismaAdvisorAdminRepository(clientWithRacingCreate({ id: "adv-1", role: "ADVISOR" }));

    await expect(repository.inviteAdvisor(invite)).resolves.toEqual({ status: "ALREADY_INVITED" });
  });

  it("레이스 후 재조회한 사용자가 ADVISOR가 아니면 거부한다", async () => {
    const repository = new PrismaAdvisorAdminRepository(clientWithRacingCreate({ id: "stu-1", role: "STUDENT" }));

    await expect(repository.inviteAdvisor({ ...invite, email: "student@example.com" }))
      .resolves.toEqual({ status: "EMAIL_TAKEN" });
  });

  it("새 계정을 만들어 초대하면 감사 로그를 남긴다", async () => {
    const { client, auditLog, programAdvisorInvitation } = clientWithInvitation(null);
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.inviteAdvisor(invite))
      .resolves.toEqual({ status: "INVITED", userId: "adv-9", invitationId: "inv-9", reusedAccount: false });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: "admin-1", action: "ADVISOR_REGISTERED", targetId: "adv-9" }),
    });
    expect(programAdvisorInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ programId: "prog-1", userId: "adv-9" }) }),
    );
  });

  it("이 프로그램에 살아 있는 초대가 있으면 새 링크를 내보내지 않는다", async () => {
    const { client, programAdvisorInvitation } = clientWithInvitation({ id: "inv-1", revokedAt: null });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.inviteAdvisor(invite)).resolves.toEqual({ status: "ALREADY_INVITED" });
    expect(programAdvisorInvitation.create).not.toHaveBeenCalled();
    expect(programAdvisorInvitation.update).not.toHaveBeenCalled();
  });

  it("거둬 둔 초대는 새로 만들지 않고 되살린다", async () => {
    // (programId, userId)가 유니크라 새로 만들면 충돌한다.
    const { client, programAdvisorInvitation } = clientWithInvitation({ id: "inv-1", revokedAt: new Date("2026-08-01T00:00:00Z") });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.inviteAdvisor(invite))
      .resolves.toEqual({ status: "INVITED", userId: "adv-9", invitationId: "inv-1", reusedAccount: false });
    expect(programAdvisorInvitation.create).not.toHaveBeenCalled();
    expect(programAdvisorInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv-1" }, data: expect.objectContaining({ revokedAt: null }) }),
    );
  });
});

// 회수는 초대행·토큰·팀배정·세션·계정상태·감사로그를 한 트랜잭션에서 다룬다.
function clientForRevoke(input: { remainingInvitations: number; invitationFound?: boolean }) {
  const programAdvisorInvitation = {
    findFirst: vi.fn().mockResolvedValue(input.invitationFound === false ? null : { id: "inv-1" }),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(input.remainingInvitations),
  };
  const advisorAccessToken = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
  const projectAdvisor = { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) };
  const session = { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) };
  const user = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
  const auditLog = { create: vi.fn().mockResolvedValue({}) };
  const transaction = { programAdvisorInvitation, advisorAccessToken, projectAdvisor, session, user, auditLog };
  const client = {
    ...transaction,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(transaction)),
  } as unknown as PrismaClient;
  return { client, programAdvisorInvitation, advisorAccessToken, projectAdvisor, session, user, auditLog };
}

const revokeInput = {
  revokedAt: new Date("2026-09-08T00:00:00Z"),
  actorId: "admin-1",
  target: { programId: "prog-1", userId: "adv-1" },
};

describe("PrismaAdvisorAdminRepository.revokeInvitation", () => {
  it("초대가 하나도 남지 않으면 계정도 비활성으로 내린다", async () => {
    // 링크와 세션만 끊고 계정을 활성으로 두면 사용자 목록이 "아직 접속할 수 있는 사람" 으로 보여 준다.
    const { client, user, session } = clientForRevoke({ remainingInvitations: 0 });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.revokeInvitation(revokeInput)).resolves.toBe(true);

    expect(session.deleteMany).toHaveBeenCalled();
    expect(user.updateMany).toHaveBeenCalledWith({
      where: { id: "adv-1", role: "ADVISOR", accountStatus: "ACTIVE" },
      data: { accountStatus: "DISABLED" },
    });
  });

  it("다른 프로그램 초대가 남아 있으면 계정을 건드리지 않는다", async () => {
    // 한쪽을 거뒀다고 다른 프로그램 심사 중인 위원을 잠글 이유는 없다.
    const { client, user, session } = clientForRevoke({ remainingInvitations: 1 });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.revokeInvitation(revokeInput)).resolves.toBe(true);

    expect(session.deleteMany).not.toHaveBeenCalled();
    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("탈퇴 계정은 되돌리지 않는다", async () => {
    // 조건에 accountStatus: ACTIVE 를 둬서 탈퇴·이미 비활성 계정은 갱신 대상에서 빠진다.
    const { client, user } = clientForRevoke({ remainingInvitations: 0 });
    const repository = new PrismaAdvisorAdminRepository(client);

    await repository.revokeInvitation(revokeInput);

    expect(user.updateMany.mock.calls[0][0].where.accountStatus).toBe("ACTIVE");
  });

  it("초대가 없으면 아무것도 건드리지 않는다", async () => {
    const { client, user, advisorAccessToken } = clientForRevoke({ remainingInvitations: 0, invitationFound: false });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.revokeInvitation(revokeInput)).resolves.toBe(false);

    expect(advisorAccessToken.updateMany).not.toHaveBeenCalled();
    expect(user.updateMany).not.toHaveBeenCalled();
  });
});

// 재초대는 회수가 내려 둔 계정을 되살려야 한다. 그러지 않으면 새 링크가 열리지 않는다.
function clientWithExistingAdvisor(accountStatus: string, liveInvitations = 0) {
  const user = {
    findUnique: vi.fn().mockResolvedValue({ id: "adv-1", role: "ADVISOR", accountStatus }),
    create: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const auditLog = { create: vi.fn().mockResolvedValue({}) };
  const programAdvisorInvitation = {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "inv-9" }),
    update: vi.fn(),
    count: vi.fn().mockResolvedValue(liveInvitations),
  };
  const transaction = { user, auditLog, programAdvisorInvitation };
  const client = {
    ...transaction,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(transaction)),
  } as unknown as PrismaClient;
  return { client, user, programAdvisorInvitation };
}

describe("PrismaAdvisorAdminRepository.inviteAdvisor 계정 되살리기", () => {
  it("회수로 비활성이 된 계정을 다시 부르면 활성으로 되돌린다", async () => {
    // 되살리지 않으면 링크가 발급돼도 토큰 로그인이 accountStatus 검사에서 막힌다.
    const { client, user } = clientWithExistingAdvisor("DISABLED");
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.inviteAdvisor(invite))
      .resolves.toEqual({ status: "INVITED", userId: "adv-1", invitationId: "inv-9", reusedAccount: true });
    expect(user.updateMany).toHaveBeenCalledWith({
      where: { id: "adv-1", role: "ADVISOR", accountStatus: "DISABLED" },
      data: { accountStatus: "ACTIVE" },
    });
  });

  it("이미 활성인 계정은 갱신하지 않는다", async () => {
    const { client, user } = clientWithExistingAdvisor("ACTIVE");
    const repository = new PrismaAdvisorAdminRepository(client);

    await repository.inviteAdvisor(invite);

    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("탈퇴 계정은 되살리지 않는다", async () => {
    // 탈퇴는 비활성화보다 무거운 상태라 초대만으로 뒤집어선 안 된다.
    const { client, user } = clientWithExistingAdvisor("WITHDRAWN");
    const repository = new PrismaAdvisorAdminRepository(client);

    await repository.inviteAdvisor(invite);

    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("살아 있는 초대가 있는 비활성 계정은 운영자가 직접 잠근 것이므로 초대를 거절한다", async () => {
    // 회수와 정리 마이그레이션은 살아 있는 초대가 0일 때만 계정을 내린다. 그래서 이 조합은
    // setActive 로만 만들어진다. 되살리면 그 위원이 들고 있던 다른 프로그램 링크와 팀 배정까지
    // 함께 열린다 -- setActive 는 세션만 지우고 토큰은 회수하지 않는다.
    const { client, user, programAdvisorInvitation } = clientWithExistingAdvisor("DISABLED", 1);
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.inviteAdvisor(invite)).resolves.toEqual({ status: "ACCOUNT_DISABLED" });

    expect(user.updateMany).not.toHaveBeenCalled();
    expect(programAdvisorInvitation.create).not.toHaveBeenCalled();
    expect(programAdvisorInvitation.count).toHaveBeenCalledWith({
      where: { userId: "adv-1", revokedAt: null },
    });
  });
});

// 다시 초대: 거둔 초대행을 그 자리에서 되살린다.
function clientForReinvite(invitation: { revokedAt: Date | null; role?: string; accountStatus?: string } | null, liveInvitations = 0) {
  const programAdvisorInvitation = {
    findUnique: vi.fn().mockResolvedValue(invitation && {
      id: "inv-1",
      revokedAt: invitation.revokedAt,
      user: { role: invitation.role ?? "ADVISOR", accountStatus: invitation.accountStatus ?? "ACTIVE" },
    }),
    update: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(liveInvitations),
  };
  const user = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
  const auditLog = { create: vi.fn().mockResolvedValue({}) };
  const transaction = { programAdvisorInvitation, user, auditLog };
  const client = {
    ...transaction,
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(transaction)),
  } as unknown as PrismaClient;
  return { client, programAdvisorInvitation, user };
}

const reinvite = { programId: "prog-1", userId: "adv-1", actorId: "admin-1" };

describe("PrismaAdvisorAdminRepository.reinviteAdvisor", () => {
  it("거둔 초대를 되살린다", async () => {
    const { client, programAdvisorInvitation } = clientForReinvite({ revokedAt: new Date("2026-09-01T00:00:00Z") });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.reinviteAdvisor(reinvite)).resolves.toEqual({ status: "INVITED", invitationId: "inv-1" });

    expect(programAdvisorInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv-1" }, data: expect.objectContaining({ revokedAt: null }) }),
    );
  });

  it("회수로 내려간 계정은 다시 부를 때 함께 되살린다", async () => {
    // 계정이 비활성인 채로 링크를 내주면 토큰 로그인이 accountStatus 검사에서 막힌다.
    const { client, user } = clientForReinvite({ revokedAt: new Date("2026-09-01T00:00:00Z"), accountStatus: "DISABLED" });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.reinviteAdvisor(reinvite)).resolves.toEqual({ status: "INVITED", invitationId: "inv-1" });

    expect(user.updateMany).toHaveBeenCalledWith({
      where: { id: "adv-1", role: "ADVISOR", accountStatus: "DISABLED" },
      data: { accountStatus: "ACTIVE" },
    });
  });

  it("살아 있는 초대가 있는 비활성 계정은 운영자가 잠근 것이므로 되살리지 않는다", async () => {
    // inviteAdvisor 와 같은 표지를 쓴다. 두 경로가 다르게 판단하면 한쪽으로 우회할 수 있다.
    const { client, programAdvisorInvitation, user } = clientForReinvite(
      { revokedAt: new Date("2026-09-01T00:00:00Z"), accountStatus: "DISABLED" },
      1,
    );
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.reinviteAdvisor(reinvite)).resolves.toEqual({ status: "ACCOUNT_DISABLED" });

    expect(programAdvisorInvitation.update).not.toHaveBeenCalled();
    expect(user.updateMany).not.toHaveBeenCalled();
  });

  it("탈퇴 계정은 되살리지 않는다", async () => {
    const { client, programAdvisorInvitation } = clientForReinvite({ revokedAt: new Date("2026-09-01T00:00:00Z"), accountStatus: "WITHDRAWN" });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.reinviteAdvisor(reinvite)).resolves.toEqual({ status: "ACCOUNT_DISABLED" });

    expect(programAdvisorInvitation.update).not.toHaveBeenCalled();
  });

  it("이미 살아 있는 초대는 되살릴 것이 없다", async () => {
    const { client, programAdvisorInvitation } = clientForReinvite({ revokedAt: null });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.reinviteAdvisor(reinvite)).resolves.toEqual({ status: "ALREADY_INVITED" });

    expect(programAdvisorInvitation.update).not.toHaveBeenCalled();
  });

  it("이 프로그램에 초대 이력이 없으면 거절한다", async () => {
    const { client } = clientForReinvite(null);
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.reinviteAdvisor(reinvite)).resolves.toEqual({ status: "NOT_FOUND" });
  });

  it("자문위원이 아닌 계정은 거절한다", async () => {
    const { client } = clientForReinvite({ revokedAt: new Date("2026-09-01T00:00:00Z"), role: "STUDENT" });
    const repository = new PrismaAdvisorAdminRepository(client);

    await expect(repository.reinviteAdvisor(reinvite)).resolves.toEqual({ status: "NOT_FOUND" });
  });
});
