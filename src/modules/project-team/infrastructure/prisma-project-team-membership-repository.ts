import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ProjectTeamMembershipRepository, ProjectTeamMembershipOutcome } from "@/modules/project-team/application/manage-project-team-membership";

export class PrismaProjectTeamMembershipRepository implements ProjectTeamMembershipRepository {
  constructor(private readonly client: PrismaClient) {}

  leave(input: Parameters<ProjectTeamMembershipRepository["leave"]>[0]) {
    return this.endActiveMembership({ ...input, targetUserId: input.actor.id, endReason: "LEFT" as const, action: "PROJECT_TEAM_MEMBER_LEFT" as const });
  }

  remove(input: Parameters<ProjectTeamMembershipRepository["remove"]>[0]) {
    return this.endActiveMembership({ ...input, endReason: "REMOVED" as const, action: "PROJECT_TEAM_MEMBER_REMOVED" as const });
  }

  private endActiveMembership(input: {
    projectTeamId: string;
    targetUserId: string;
    actor: { id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN" };
    changedAt: Date;
    endReason: "LEFT" | "REMOVED";
    action: "PROJECT_TEAM_MEMBER_LEFT" | "PROJECT_TEAM_MEMBER_REMOVED";
  }): Promise<ProjectTeamMembershipOutcome> {
    return this.client.$transaction(async (transaction) => {
      const team = await lockTeam(transaction, input.projectTeamId);
      if (!team) return "NOT_FOUND";
      if (team.status !== "ACTIVE" || team.programEndsAt <= input.changedAt) return "NOT_ACTIVE";
      const target = await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, userId: input.targetUserId, endedAt: null },
        select: { id: true, role: true },
      });
      if (!target) return "NOT_FOUND";
      const actorMembership = await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, userId: input.actor.id, endedAt: null },
        select: { role: true },
      });
      const selfLeave = input.action === "PROJECT_TEAM_MEMBER_LEFT" && input.targetUserId === input.actor.id;
      const canRemove = input.actor.role === "ADMIN" || actorMembership?.role === "LEADER";
      if (!selfLeave && !canRemove) return "FORBIDDEN";
      if (target.role === "LEADER") return "LEADER_TRANSFER_REQUIRED";
      await transaction.projectTeamMembership.update({
        where: { id: target.id },
        data: { endedAt: input.changedAt, endReason: input.endReason },
      });
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: input.action,
        targetType: "PROJECT_TEAM_MEMBERSHIP",
        targetId: target.id,
        metadata: { projectTeamId: team.id, projectId: team.projectId, userId: input.targetUserId },
        createdAt: input.changedAt,
      } });
      return "UPDATED";
    });
  }

  transferLeadership(input: Parameters<ProjectTeamMembershipRepository["transferLeadership"]>[0]): Promise<ProjectTeamMembershipOutcome> {
    return this.client.$transaction(async (transaction) => {
      const team = await lockTeam(transaction, input.projectTeamId);
      if (!team) return "NOT_FOUND";
      if (team.status !== "ACTIVE" || team.programEndsAt <= input.changedAt) return "NOT_ACTIVE";
      const current = await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, role: "LEADER", endedAt: null },
        select: { id: true, userId: true },
      });
      if (!current) return "CONFLICT";
      if (input.actor.role !== "ADMIN" && current.userId !== input.actor.id) return "FORBIDDEN";
      const next = await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, userId: input.nextLeaderId, endedAt: null },
        select: { id: true },
      });
      if (!next || next.id === current.id) return "CONFLICT";
      await transaction.projectTeamMembership.update({ where: { id: current.id }, data: { role: "MEMBER" } });
      await transaction.projectTeamMembership.update({ where: { id: next.id }, data: { role: "LEADER" } });
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: "PROJECT_TEAM_LEADERSHIP_TRANSFERRED",
        targetType: "PROJECT_TEAM",
        targetId: team.id,
        metadata: { projectId: team.projectId, previousLeaderId: current.userId, nextLeaderId: input.nextLeaderId },
        createdAt: input.changedAt,
      } });
      return "UPDATED";
    });
  }

}

function lockTeam(transaction: Prisma.TransactionClient, projectTeamId: string) {
  return transaction.$queryRaw<Array<{ id: string; projectId: string; status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE"; programEndsAt: Date }>>(Prisma.sql`
    SELECT "project_team"."id", "project_team"."projectId", "topic"."status", "project_program"."endsAt" AS "programEndsAt"
    FROM "project_team"
    JOIN "topic" ON "topic"."id" = "project_team"."projectId"
    JOIN "project_program" ON "project_program"."id" = "topic"."programId"
    WHERE "project_team"."id" = ${projectTeamId}
    FOR UPDATE OF "project_team", "topic"
  `).then((rows) => rows[0]);
}
