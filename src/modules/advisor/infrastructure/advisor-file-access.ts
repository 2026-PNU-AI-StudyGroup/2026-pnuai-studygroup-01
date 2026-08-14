import { Prisma } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { teamActorWhere } from "@/modules/team/infrastructure/prisma-team-workspace-authorization";

/**
 * 팀 파일(제출물·보고서)에 접근 가능한 팀 조건.
 * ADMIN: 전체, ADVISOR: 배정된 topic의 팀만, 그 외: 담당 교수/조교 또는 팀원.
 */
export function teamFileAccessWhere(actor: CurrentActor): Prisma.ProjectTeamWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "ADVISOR") {
    return { project: { advisors: { some: { userId: actor.id } } } };
  }
  return teamActorWhere(actor);
}
