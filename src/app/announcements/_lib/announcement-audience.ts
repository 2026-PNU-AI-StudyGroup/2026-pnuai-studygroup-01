import "server-only";

import type { AnnouncementAudience } from "@/modules/announcement/application/announcement-ports";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

// 공지 수신 대상 = 본인이 속한 팀·프로그램. 학생은 확정 팀(TeamMember),
// 교수는 지도 중인 팀(Team.professorId)과 본인이 만든 프로그램.
export async function resolveAnnouncementAudience(actor: CurrentActor): Promise<AnnouncementAudience> {
  if (actor.role === "ADMIN") {
    return { role: actor.role, actorId: actor.id, teamIds: [], programIds: [] };
  }
  // 공유 prisma 클라이언트에서 동시 쿼리는 pg 경고를 유발하므로 순차 실행.
  const memberships = await prisma.teamMember.findMany({ where: { studentId: actor.id }, select: { teamId: true, programId: true } });
  const supervisedTeams = actor.role === "PROFESSOR"
    ? await prisma.team.findMany({ where: { professorId: actor.id }, select: { id: true, programId: true } })
    : [];
  const createdPrograms = actor.role === "PROFESSOR"
    ? await prisma.projectProgram.findMany({ where: { createdById: actor.id }, select: { id: true } })
    : [];
  const teamIds = new Set<string>();
  const programIds = new Set<string>();
  for (const m of memberships) { teamIds.add(m.teamId); programIds.add(m.programId); }
  for (const t of supervisedTeams) { teamIds.add(t.id); programIds.add(t.programId); }
  for (const p of createdPrograms) programIds.add(p.id);
  return { role: actor.role, actorId: actor.id, teamIds: [...teamIds], programIds: [...programIds] };
}

export type AnnouncementTargets = {
  programs: { id: string; name: string }[];
  teams: { id: string; name: string }[];
};

// 공지 작성 시 지정 가능한 대상. 관리자는 전체, 교수는 본인 소관.
export async function resolveAnnouncementTargets(actor: CurrentActor): Promise<AnnouncementTargets> {
  if (actor.role === "ADMIN") {
    const programs = await prisma.projectProgram.findMany({ select: { id: true, name: true }, orderBy: [{ startsAt: "desc" }, { name: "asc" }] });
    const teams = await prisma.team.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } });
    return { programs, teams };
  }
  const supervisedTeams = await prisma.team.findMany({ where: { professorId: actor.id }, select: { id: true, name: true, programId: true }, orderBy: { createdAt: "desc" } });
  const createdPrograms = await prisma.projectProgram.findMany({ where: { createdById: actor.id }, select: { id: true, name: true } });
  const programIds = [...new Set([...createdPrograms.map((p) => p.id), ...supervisedTeams.map((t) => t.programId)])];
  const programs = programIds.length
    ? await prisma.projectProgram.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true }, orderBy: [{ startsAt: "desc" }, { name: "asc" }] })
    : [];
  return {
    programs,
    teams: supervisedTeams.map((t) => ({ id: t.id, name: t.name })),
  };
}
