import { Prisma } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { teamSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

/**
 * 팀 파일(제출물·보고서)에 접근 가능한 팀 조건.
 * ADMIN: 전체, ADVISOR: 배정된 topic의 팀만, 그 외: 담당 교수/조교 또는 팀원.
 */
export function teamFileAccessWhere(actor: CurrentActor): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "ADVISOR") {
    return { topic: { advisors: { some: { userId: actor.id } } } };
  }
  return {
    OR: [
      teamSupervisorWhere(actor),
      { members: { some: { studentId: actor.id } } },
    ],
  };
}
