import type { PrismaClient, Prisma } from "@/generated/prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

/** 이 위원이 지금 이 프로그램에 불려 있는지. 투표·열람 권한의 기준점. */
export async function hasActiveAdvisorInvitation(
  client: Client,
  input: { userId: string; programId: string },
): Promise<boolean> {
  const invitation = await client.programAdvisorInvitation.findFirst({
    where: { userId: input.userId, programId: input.programId, revokedAt: null },
    select: { id: true },
  });
  return invitation !== null;
}

/** 이 위원이 불려 있는 프로그램들. 화면에서 그 밖의 프로그램은 아예 걸러 낸다. */
export async function listInvitedProgramIds(client: Client, userId: string): Promise<string[]> {
  const invitations = await client.programAdvisorInvitation.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { programId: true },
  });
  return invitations.map((invitation) => invitation.programId);
}

export type AdvisorProgramHistoryRow = {
  programId: string;
  programName: string;
  invitedAt: Date;
  revokedAt: Date | null;
};

/**
 * 이 위원들이 어느 프로그램에 불려 있었는지. 사용자 관리 화면이 한 사람의 내력을 펼쳐 보일 때 쓴다.
 *
 * 자문위원은 계정만 봐서는 무엇을 하는 사람인지 알 수 없다. 어느 프로그램 심사단이었고
 * 언제 회수됐는지가 그 계정의 내용이다. 목록 화면에서 쓰므로 사람마다 조회하지 않고
 * 한 번에 받아 userId 로 묶어 돌려준다.
 */
export async function listAdvisorProgramHistory(
  client: Client,
  userIds: readonly string[],
): Promise<Map<string, AdvisorProgramHistoryRow[]>> {
  const grouped = new Map<string, AdvisorProgramHistoryRow[]>();
  if (userIds.length === 0) return grouped;
  const invitations = await client.programAdvisorInvitation.findMany({
    where: { userId: { in: [...userIds] } },
    // 살아 있는 초대가 먼저, 거둔 초대는 최근에 거둔 것부터.
    orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    select: {
      userId: true,
      programId: true,
      createdAt: true,
      revokedAt: true,
      program: { select: { name: true } },
    },
  });
  for (const invitation of invitations) {
    const rows = grouped.get(invitation.userId) ?? [];
    rows.push({
      programId: invitation.programId,
      programName: invitation.program.name,
      invitedAt: invitation.createdAt,
      revokedAt: invitation.revokedAt,
    });
    grouped.set(invitation.userId, rows);
  }
  return grouped;
}
