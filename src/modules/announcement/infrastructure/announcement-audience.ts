import "server-only";

import type { AnnouncementAudience } from "@/modules/announcement/application/announcement-ports";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  teamSupervisorWhere,
  topicSupervisorWhere,
} from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function resolveAnnouncementAudience(actor: CurrentActor): Promise<AnnouncementAudience> {
  if (actor.role === "ADMIN") {
    return { role: actor.role, actorId: actor.id, teamIds: [], programIds: [] };
  }
  const now = new Date();
  const memberships = await prisma.projectTeamMembership.findMany({
    where: { userId: actor.id, endedAt: null, projectTeam: { OR: [
      { project: { program: { endsAt: { gt: now } } } },
      { confirmedAt: { not: null } },
    ] } },
    select: { projectTeamId: true, projectTeam: { select: { project: { select: { programId: true } } } } },
  });
  const supervisedTeams = actor.role === "PROFESSOR"
    ? await prisma.projectTeam.findMany({ where: { AND: [teamSupervisorWhere(actor), { OR: [
      { project: { program: { endsAt: { gt: now } } } },
      { confirmedAt: { not: null } },
    ] }] }, select: { id: true, project: { select: { programId: true } } } })
    : [];
  const managedTopics = actor.role === "PROFESSOR"
    ? await prisma.topic.findMany({ where: topicSupervisorWhere(actor), select: { programId: true }, distinct: ["programId"] })
    : [];
  const createdPrograms = actor.role === "PROFESSOR"
    ? await prisma.projectProgram.findMany({ where: { createdById: actor.id }, select: { id: true } })
    : [];
  const teamIds = new Set<string>();
  const programIds = new Set<string>();
  for (const membership of memberships) { teamIds.add(membership.projectTeamId); programIds.add(membership.projectTeam.project.programId); }
  for (const team of supervisedTeams) { teamIds.add(team.id); programIds.add(team.project.programId); }
  for (const topic of managedTopics) programIds.add(topic.programId);
  for (const program of createdPrograms) programIds.add(program.id);
  return { role: actor.role, actorId: actor.id, teamIds: [...teamIds], programIds: [...programIds] };
}

export type AnnouncementTargets = {
  programs: { id: string; name: string }[];
  teams: { id: string; name: string; programId: string; projectId: string }[];
};

export async function resolveAnnouncementTargets(actor: CurrentActor): Promise<AnnouncementTargets> {
  if (actor.role === "ADMIN") {
    const programs = await prisma.projectProgram.findMany({ select: { id: true, name: true }, orderBy: [{ startsAt: "desc" }, { name: "asc" }] });
    const teams = await prisma.projectTeam.findMany({ select: { id: true, name: true, projectId: true, project: { select: { programId: true } } }, orderBy: { createdAt: "desc" } });
    return { programs, teams: teams.map(({ project, ...team }) => ({ ...team, programId: project.programId })) };
  }
  const supervisedTeams = await prisma.projectTeam.findMany({ where: teamSupervisorWhere(actor), select: { id: true, name: true, projectId: true, project: { select: { programId: true } } }, orderBy: { createdAt: "desc" } });
  const managedTopics = await prisma.topic.findMany({ where: topicSupervisorWhere(actor), select: { programId: true }, distinct: ["programId"] });
  const createdPrograms = await prisma.projectProgram.findMany({ where: { createdById: actor.id }, select: { id: true, name: true } });
  const programIds = [...new Set([
    ...createdPrograms.map((program) => program.id),
    ...supervisedTeams.map((team) => team.project.programId),
    ...managedTopics.map((topic) => topic.programId),
  ])];
  const programs = programIds.length
    ? await prisma.projectProgram.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true }, orderBy: [{ startsAt: "desc" }, { name: "asc" }] })
    : [];
  return {
    programs,
    teams: supervisedTeams.map((team) => ({ id: team.id, name: team.name, projectId: team.projectId, programId: team.project.programId })),
  };
}
