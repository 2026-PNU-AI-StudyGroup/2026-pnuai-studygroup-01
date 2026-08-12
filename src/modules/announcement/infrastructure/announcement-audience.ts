import "server-only";

import type { AnnouncementAudience } from "@/modules/announcement/application/announcement-ports";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function resolveAnnouncementAudience(actor: CurrentActor): Promise<AnnouncementAudience> {
  if (actor.role === "ADMIN") {
    return { role: actor.role, actorId: actor.id, teamIds: [], programIds: [] };
  }
  const memberships = await prisma.teamMember.findMany({ where: { studentId: actor.id }, select: { teamId: true, programId: true } });
  const supervisedTeams = actor.role === "PROFESSOR"
    ? await prisma.team.findMany({ where: { professorId: actor.id }, select: { id: true, programId: true } })
    : [];
  const managedTopics = actor.role === "PROFESSOR"
    ? await prisma.topic.findMany({ where: { managerId: actor.id }, select: { programId: true }, distinct: ["programId"] })
    : [];
  const createdPrograms = actor.role === "PROFESSOR"
    ? await prisma.projectProgram.findMany({ where: { createdById: actor.id }, select: { id: true } })
    : [];
  const teamIds = new Set<string>();
  const programIds = new Set<string>();
  for (const membership of memberships) { teamIds.add(membership.teamId); programIds.add(membership.programId); }
  for (const team of supervisedTeams) { teamIds.add(team.id); programIds.add(team.programId); }
  for (const topic of managedTopics) programIds.add(topic.programId);
  for (const program of createdPrograms) programIds.add(program.id);
  return { role: actor.role, actorId: actor.id, teamIds: [...teamIds], programIds: [...programIds] };
}

export type AnnouncementTargets = {
  programs: { id: string; name: string }[];
  teams: { id: string; name: string; programId: string }[];
};

export async function resolveAnnouncementTargets(actor: CurrentActor): Promise<AnnouncementTargets> {
  if (actor.role === "ADMIN") {
    const programs = await prisma.projectProgram.findMany({ select: { id: true, name: true }, orderBy: [{ startsAt: "desc" }, { name: "asc" }] });
    const teams = await prisma.team.findMany({ select: { id: true, name: true, programId: true }, orderBy: { createdAt: "desc" } });
    return { programs, teams };
  }
  const supervisedTeams = await prisma.team.findMany({ where: { professorId: actor.id }, select: { id: true, name: true, programId: true }, orderBy: { createdAt: "desc" } });
  const managedTopics = await prisma.topic.findMany({ where: { managerId: actor.id }, select: { programId: true }, distinct: ["programId"] });
  const createdPrograms = await prisma.projectProgram.findMany({ where: { createdById: actor.id }, select: { id: true, name: true } });
  const programIds = [...new Set([
    ...createdPrograms.map((program) => program.id),
    ...supervisedTeams.map((team) => team.programId),
    ...managedTopics.map((topic) => topic.programId),
  ])];
  const programs = programIds.length
    ? await prisma.projectProgram.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true }, orderBy: [{ startsAt: "desc" }, { name: "asc" }] })
    : [];
  return {
    programs,
    teams: supervisedTeams.map((team) => ({ id: team.id, name: team.name, programId: team.programId })),
  };
}
