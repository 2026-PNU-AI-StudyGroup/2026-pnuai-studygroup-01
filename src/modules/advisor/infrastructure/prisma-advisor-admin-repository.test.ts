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
