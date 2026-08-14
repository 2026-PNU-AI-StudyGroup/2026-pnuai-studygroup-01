import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";
import type { ProjectTeamMembershipRepository, ProjectTeamMembershipOutcome } from "@/modules/project-team/application/manage-project-team-membership";
import { teamSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

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
      const team = await lockTeam(transaction, input.projectTeamId, input.actor);
      if (!team) return "NOT_FOUND";
      if (!isTeamInProgress(team, input.changedAt)) return "NOT_ACTIVE";
      await lockUsers(transaction, [input.targetUserId]);
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
      const canRemove = team.canSupervise || actorMembership?.role === "LEADER";
      if (!selfLeave && !canRemove) return "FORBIDDEN";
      if (target.role === "LEADER") return "LEADER_TRANSFER_REQUIRED";
      await transaction.projectTeamMembership.update({
        where: { id: target.id },
        data: { endedAt: input.changedAt, endReason: input.endReason },
      });
      await enqueueProjectMembershipNotification(transaction, {
        recipientId: input.targetUserId,
        projectId: team.projectId,
        title: input.endReason === "REMOVED" ? "프로젝트 구성원에서 제외되었습니다" : "프로젝트 팀에서 나왔습니다",
        body: input.endReason === "REMOVED"
          ? "프로젝트 팀 구성원에서 제외되어 더 이상 프로젝트 업무에 참여할 수 없습니다."
          : "프로젝트 팀에서 나왔습니다. 프로젝트 이력은 유지됩니다.",
        titleEn: input.endReason === "REMOVED" ? "Removed from project team" : "You left the project team",
        bodyEn: input.endReason === "REMOVED"
          ? "You were removed from the project team and can no longer take part in its work."
          : "You left the project team. Your project history is retained.",
        dedupeKey: `project-membership:${target.id}:${input.endReason}`,
        createdAt: input.changedAt,
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
      const team = await lockTeam(transaction, input.projectTeamId, input.actor);
      if (!team) return "NOT_FOUND";
      if (!isTeamInProgress(team, input.changedAt)) return "NOT_ACTIVE";
      await lockUsers(transaction, [input.nextLeaderId]);
      const current = await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, role: "LEADER", endedAt: null },
        select: { id: true, userId: true },
      });
      if (!current) return "CONFLICT";
      if (!team.canSupervise && current.userId !== input.actor.id) return "FORBIDDEN";
      const next = await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, userId: input.nextLeaderId, endedAt: null },
        select: { id: true, role: true },
      });
      if (!next || next.id === current.id || next.role !== "MEMBER") return "CONFLICT";
      await transaction.projectTeamMembership.update({ where: { id: current.id }, data: { role: "MEMBER" } });
      await transaction.projectTeamMembership.update({ where: { id: next.id }, data: { role: "LEADER" } });
      await Promise.all([
        enqueueProjectMembershipNotification(transaction, {
          recipientId: current.userId,
          projectId: team.projectId,
          title: "프로젝트 팀장 역할이 변경되었습니다",
          body: "프로젝트 팀장 역할이 다른 구성원에게 인계되었습니다.",
          titleEn: "Project team leader changed",
          bodyEn: "The project team leader role was transferred to another member.",
          dedupeKey: `project-leadership:${team.id}:${current.userId}:${input.nextLeaderId}`,
          createdAt: input.changedAt,
        }),
        enqueueProjectMembershipNotification(transaction, {
          recipientId: input.nextLeaderId,
          projectId: team.projectId,
          title: "프로젝트 팀장으로 지정되었습니다",
          body: "프로젝트 팀장으로 지정되었습니다. 팀 업무와 요청을 확인해 주세요.",
          titleEn: "You are now the project team leader",
          bodyEn: "You have been assigned as the project team leader. Review team work and requests in PMS.",
          dedupeKey: `project-leadership:${team.id}:${input.nextLeaderId}:${current.userId}`,
          createdAt: input.changedAt,
        }),
      ]);
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

  removeLeaderAndTransfer(input: Parameters<ProjectTeamMembershipRepository["removeLeaderAndTransfer"]>[0]): Promise<ProjectTeamMembershipOutcome> {
    return this.client.$transaction(async (transaction) => {
      const team = await lockTeam(transaction, input.projectTeamId, input.actor);
      if (!team) return "NOT_FOUND";
      if (!isTeamInProgress(team, input.changedAt)) return "NOT_ACTIVE";
      if (input.targetUserId === input.nextLeaderId) return "CONFLICT";
      await lockUsers(transaction, [input.targetUserId, input.nextLeaderId]);

      const [target, actorMembership, next] = await Promise.all([
        transaction.projectTeamMembership.findFirst({
          where: { projectTeamId: team.id, userId: input.targetUserId, endedAt: null },
          select: { id: true, userId: true, role: true },
        }),
        transaction.projectTeamMembership.findFirst({
          where: { projectTeamId: team.id, userId: input.actor.id, endedAt: null },
          select: { role: true },
        }),
        transaction.projectTeamMembership.findFirst({
          where: { projectTeamId: team.id, userId: input.nextLeaderId, endedAt: null },
          select: { id: true, userId: true, role: true },
        }),
      ]);
      if (!target) return "NOT_FOUND";
      if (!team.canSupervise && actorMembership?.role !== "LEADER") return "FORBIDDEN";
      if (target.role !== "LEADER" || !next || next.role !== "MEMBER") return "CONFLICT";

      const selfLeave = target.userId === input.actor.id;
      const endReason = selfLeave ? "LEFT" as const : "REMOVED" as const;
      const removalAction = selfLeave ? "PROJECT_TEAM_MEMBER_LEFT" as const : "PROJECT_TEAM_MEMBER_REMOVED" as const;
      await transaction.projectTeamMembership.update({
        where: { id: target.id },
        data: { endedAt: input.changedAt, endReason },
      });
      await transaction.projectTeamMembership.update({
        where: { id: next.id },
        data: { role: "LEADER" },
      });
      await Promise.all([
        enqueueProjectMembershipNotification(transaction, {
          recipientId: target.userId,
          projectId: team.projectId,
          title: selfLeave ? "프로젝트 팀에서 나왔습니다" : "프로젝트 구성원에서 제외되었습니다",
          body: selfLeave
            ? "프로젝트 팀에서 나왔습니다. 프로젝트 이력은 유지됩니다."
            : "프로젝트 팀 구성원에서 제외되어 더 이상 프로젝트 업무에 참여할 수 없습니다.",
          titleEn: selfLeave ? "You left the project team" : "Removed from project team",
          bodyEn: selfLeave
            ? "You left the project team. Your project history is retained."
            : "You were removed from the project team and can no longer take part in its work.",
          dedupeKey: `project-membership:${target.id}:${endReason}`,
          createdAt: input.changedAt,
        }),
        enqueueProjectMembershipNotification(transaction, {
          recipientId: next.userId,
          projectId: team.projectId,
          title: "프로젝트 팀장으로 지정되었습니다",
          body: "프로젝트 팀장으로 지정되었습니다. 팀 업무와 요청을 확인해 주세요.",
          titleEn: "You are now the project team leader",
          bodyEn: "You have been assigned as the project team leader. Review team work and requests in PMS.",
          dedupeKey: `project-leadership:${team.id}:${next.userId}:${target.userId}`,
          createdAt: input.changedAt,
        }),
      ]);
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: "PROJECT_TEAM_LEADERSHIP_TRANSFERRED",
        targetType: "PROJECT_TEAM",
        targetId: team.id,
        metadata: { projectId: team.projectId, previousLeaderId: target.userId, nextLeaderId: next.userId },
        createdAt: input.changedAt,
      } });
      await transaction.auditLog.create({ data: {
        actorId: input.actor.id,
        action: removalAction,
        targetType: "PROJECT_TEAM_MEMBERSHIP",
        targetId: target.id,
        metadata: { projectTeamId: team.id, projectId: team.projectId, userId: target.userId },
        createdAt: input.changedAt,
      } });
      return "UPDATED";
    });
  }

}

function lockTeam(transaction: Prisma.TransactionClient, projectTeamId: string, actor: Parameters<ProjectTeamMembershipRepository["leave"]>[0]["actor"]) {
  return transaction.$queryRaw<Array<LockedTeam>>(Prisma.sql`
    SELECT "project_team"."id", "project_team"."projectId", "project_team"."confirmedAt", "topic"."status", "project_program"."endsAt" AS "programEndsAt", ${teamSupervisorSql(actor)} AS "canSupervise"
    FROM "project_team"
    JOIN "topic" ON "topic"."id" = "project_team"."projectId"
    JOIN "project_program" ON "project_program"."id" = "topic"."programId"
    WHERE "project_team"."id" = ${projectTeamId}
    FOR UPDATE OF "project_team", "topic"
  `).then((rows) => rows[0]);
}

type LockedTeam = {
  id: string;
  projectId: string;
  confirmedAt: Date | null;
  status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE";
  programEndsAt: Date;
  canSupervise: boolean;
};

function isTeamInProgress(team: LockedTeam, changedAt: Date) {
  return team.status === "ACTIVE" && team.confirmedAt !== null && team.programEndsAt > changedAt;
}

async function lockUsers(transaction: Prisma.TransactionClient, userIds: string[]) {
  const orderedUserIds = [...new Set(userIds)].sort();
  await transaction.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "user"
    WHERE "id" IN (${Prisma.join(orderedUserIds)})
    ORDER BY "id"
    FOR UPDATE
  `);
}

async function enqueueProjectMembershipNotification(transaction: Prisma.TransactionClient, input: {
  recipientId: string;
  projectId: string;
  title: string;
  body: string;
  titleEn: string;
  bodyEn: string;
  dedupeKey: string;
  createdAt: Date;
}) {
  const href = `/projects/${input.projectId}`;
  await enqueueEmailEvents(transaction, [{
    kind: "PROJECT_MEMBERSHIP",
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
    titleEn: input.titleEn,
    bodyEn: input.bodyEn,
    href,
    idempotencyKey: `email:${input.dedupeKey}`,
    createdAt: input.createdAt,
  }]);
  await transaction.notification.create({
    data: {
      recipientId: input.recipientId,
      type: "SYSTEM",
      title: input.title,
      body: input.body,
      href,
      dedupeKey: input.dedupeKey,
      createdAt: input.createdAt,
    },
  });
}
