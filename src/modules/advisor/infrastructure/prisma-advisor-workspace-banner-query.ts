import type { PrismaClient } from "@/generated/prisma/client";
import { withEffectiveVoteLimit } from "@/modules/project-voting/domain/project-voting-policy";

export type AdvisorProgramBanner = {
  advisorName: string;
  programId: string;
  programName: string;
  programCategory: string;
  programStartsAt: Date;
  programEndsAt: Date;
  voting: {
    startsAt: Date;
    endsAt: Date;
    voteLimit: number;
    usedVotes: number;
    scope: "PROGRAM" | "DIVISION";
  } | null;
  candidateCount: number;
  divisionCount: number;
};

/**
 * 초대 링크로 들어온 자문위원 화면 머리에 붙일 값.
 *
 * 외부 위원은 이 시스템을 이 링크 하나로만 만난다. 어느 프로그램에 불려 왔는지, 언제까지
 * 몇 표를 쓸 수 있는지, 볼 프로젝트가 몇 개인지를 화면 맨 위에서 바로 읽을 수 있어야 한다.
 */
export async function findAdvisorProgramBanner(
  client: PrismaClient,
  input: { userId: string; programId: string },
  now: Date,
): Promise<AdvisorProgramBanner | null> {
  const invitation = await client.programAdvisorInvitation.findFirst({
    where: { userId: input.userId, programId: input.programId, revokedAt: null },
    select: {
      user: { select: { name: true } },
      program: {
        select: {
          id: true,
          name: true,
          category: true,
          startsAt: true,
          endsAt: true,
          votingPolicy: true,
          _count: { select: { divisions: true } },
        },
      },
    },
  });
  if (!invitation) return null;
  const { program } = invitation;
  const [candidateCount, usedVotes] = await Promise.all([
    // 투표용지에 서는 것과 같은 조건으로 센다. 배너 숫자와 목록 길이가 어긋나면 위원은
    // 자기가 놓친 프로젝트가 있는 줄 안다.
    client.topic.count({
      where: {
        programId: program.id,
        publishedAt: { not: null },
        status: "ACTIVE",
        OR: [{ program: { endsAt: { gt: now } } }, { projectTeam: { confirmedAt: { not: null } } }],
      },
    }),
    client.projectVote.count({ where: { programId: program.id, voterId: input.userId } }),
  ]);
  const policy = program.votingPolicy;
  return {
    advisorName: invitation.user.name,
    programId: program.id,
    programName: program.name,
    programCategory: program.category,
    programStartsAt: program.startsAt,
    programEndsAt: program.endsAt,
    voting: policy
      ? {
        startsAt: policy.startsAt,
        endsAt: policy.endsAt,
        // 자문위원 한도는 학생과 다르다(staffVoteLimit). 배너에도 같은 값을 써야 한다.
        voteLimit: withEffectiveVoteLimit(policy, "ADVISOR").voteLimit,
        usedVotes,
        scope: policy.voteLimitScope,
      }
      : null,
    candidateCount,
    divisionCount: program._count.divisions,
  };
}
