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
