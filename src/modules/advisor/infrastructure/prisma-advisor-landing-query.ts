import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

/** 자문위원이 심사하러 온 프로그램 화면. */
export function advisorProgramHref(programId: string): string {
  return `/topics?programId=${encodeURIComponent(programId)}`;
}

/**
 * 이 위원에게 개별 배정된 담당 프로젝트가 있는지.
 *
 * 담당 프로젝트 배정(ProjectAdvisor)과 프로그램 초대(ProgramAdvisorInvitation)는 별개다.
 * 초대만 받은 위원의 담당 목록은 언제나 비어 있으므로 화면과 메뉴가 이 값을 보고 갈린다.
 */
export async function hasAdvisorProjectAssignments(client: Client, userId: string): Promise<boolean> {
  return await client.projectAdvisor.count({ where: { userId } }) > 0;
}

/**
 * 자문위원을 세울 첫 화면.
 *
 * 배정이 있을 때만 담당 목록으로 보내고, 없으면 불려 온 프로그램 심사 화면으로 보낸다.
 * 초대가 하나도 없으면 /topics 가 스스로 "심사할 프로그램이 없습니다" 를 세운다.
 */
export async function findAdvisorLandingPath(client: Client, userId: string): Promise<string> {
  const [assigned, invitation] = await Promise.all([
    hasAdvisorProjectAssignments(client, userId),
    client.programAdvisorInvitation.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { programId: true },
    }),
  ]);
  if (assigned) return "/advisor";
  return invitation ? advisorProgramHref(invitation.programId) : "/topics";
}
