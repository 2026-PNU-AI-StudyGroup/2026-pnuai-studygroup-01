import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import { StudentTeamQueryService } from "@/modules/student-team/application/manage-student-teams";
import { PrismaStudentTeamQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type RecruitMembersEntry = { href: string; label: string };

/**
 * 팀원 모집 공고를 쓰러 가는 입구.
 *
 * 예전에는 이 동작이 `팀 모집 → 내 팀 → 팀 관리 → 모집 공고 작성` 네 단계 안에 숨어 있었다.
 * 게다가 지원 내역의 "팀원 모집" 버튼은 공고 작성이 아니라 둘러보기로 보내서 더 헷갈렸다.
 * 이제 둘러보기와 지원 내역 상단에서 바로 이 입구를 노출한다.
 *
 * 팀장인 팀 수에 따라 갈 곳이 다르다.
 *   0개 → 팀을 먼저 만들어야 한다
 *   1개 → 그 팀의 공고 작성 창을 바로 연다
 *   2개 이상 → 어느 팀으로 모집할지 골라야 한다
 */
export async function recruitMembersEntry(actor: CurrentUser): Promise<RecruitMembersEntry> {
  const { teams } = await new StudentTeamQueryService(
    new PrismaStudentTeamQueryRepository(prisma),
  ).listWorkspace(actor);
  const leaderTeams = teams.filter((team) => team.leaderId === actor.id);

  if (leaderTeams.length === 0) return { href: "/teams?modal=create", label: "팀 만들기" };
  if (leaderTeams.length === 1) {
    return { href: `/teams/manage/${leaderTeams[0].id}?modal=recruitment`, label: "팀원 모집하기" };
  }
  return { href: "/teams", label: "팀원 모집하기" };
}
