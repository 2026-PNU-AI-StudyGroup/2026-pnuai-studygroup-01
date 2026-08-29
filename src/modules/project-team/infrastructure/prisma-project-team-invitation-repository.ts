import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { OutboxEmailEvent } from "@/modules/email/application/email-delivery-ports";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { teamSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import type {
  InviteProjectTeamMemberOutcome,
  ProjectTeamInvitationRepository,
  ProjectTeamInvitationSummary,
  ReceivedProjectTeamInvitation,
  RespondProjectTeamInvitationOutcome,
} from "@/modules/project-team/application/project-team-invitation-ports";
import {
  canJoinProjectTeam,
  checkProjectTeamInvitation,
  normalizeInvitationEmail,
} from "@/modules/project-team/domain/project-team-invitation-policy";
import { activeProjectTeamMembershipInProgram } from "@/modules/project-team/domain/project-team-membership-scope";

type LockedTeam = {
  id: string;
  projectId: string;
  programId: string;
  title: string;
  teamName: string;
  teamMaxSize: number;
  confirmedAt: Date | null;
  status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE";
  programEndsAt: Date;
  canSupervise: boolean;
};

export class PrismaProjectTeamInvitationRepository implements ProjectTeamInvitationRepository {
  constructor(private readonly client: PrismaClient, private readonly actor: CurrentActor) {}

  private lockTeam(transaction: Prisma.TransactionClient, projectTeamId: string) {
    return transaction.$queryRaw<Array<LockedTeam>>(Prisma.sql`
      SELECT "project_team"."id", "project_team"."projectId", "topic"."programId",
        "project_team"."name" AS "teamName",
        "topic"."title", "project_program"."projectTeamMaxSize" AS "teamMaxSize",
        "project_team"."confirmedAt", "topic"."status",
        "project_program"."endsAt" AS "programEndsAt", ${teamSupervisorSql(this.actor)} AS "canSupervise"
      FROM "project_team"
      JOIN "topic" ON "topic"."id" = "project_team"."projectId"
      JOIN "project_program" ON "project_program"."id" = "topic"."programId"
      WHERE "project_team"."id" = ${projectTeamId}
      FOR UPDATE OF "project_team", "topic"
    `).then((rows) => rows[0]);
  }

  invite(input: {
    projectTeamId: string;
    actorId: string;
    email: string;
    invitedAt: Date;
  }): Promise<InviteProjectTeamMemberOutcome> {
    const email = normalizeInvitationEmail(input.email);
    return this.client.$transaction(async (transaction) => {
      const team = await this.lockTeam(transaction, input.projectTeamId);
      if (!team || team.status !== "ACTIVE" || !team.confirmedAt) return { status: "NOT_FOUND" as const };

      const isTeamLeader = Boolean(await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, userId: input.actorId, role: "LEADER", endedAt: null },
        select: { id: true },
      }));
      const invitee = await transaction.user.findUnique({
        where: { email },
        select: { id: true, name: true, accountStatus: true, role: true },
      });
      const [memberCount, pendingInvitationCount, existingMembership, otherTeamMembership] = await Promise.all([
        transaction.projectTeamMembership.count({ where: { projectTeamId: team.id, endedAt: null } }),
        transaction.projectTeamInvitation.count({ where: { projectTeamId: team.id, status: "PENDING" } }),
        invitee
          ? transaction.projectTeamMembership.findFirst({
            where: { projectTeamId: team.id, userId: invitee.id, endedAt: null },
            select: { id: true },
          })
          : Promise.resolve(null),
        // 같은 프로그램의 다른 프로젝트 팀에 이미 속했는지 본다. 이 팀 안 중복만 보던
        // 탓에 한 학생이 같은 프로그램의 팀 두 곳에 들어갈 수 있었다.
        invitee
          ? transaction.projectTeamMembership.findFirst({
            where: {
              userId: invitee.id,
              projectTeamId: { not: team.id },
              ...activeProjectTeamMembershipInProgram(team.programId),
            },
            select: { id: true },
          })
          : Promise.resolve(null),
      ]);

      const violation = checkProjectTeamInvitation({
        access: { canSupervise: team.canSupervise, isTeamLeader },
        programEndsAt: team.programEndsAt,
        now: input.invitedAt,
        email,
        memberCount,
        pendingInvitationCount,
        teamMaxSize: team.teamMaxSize,
        inviteeAlreadyMember: Boolean(existingMembership),
        invitee,
        inviteeInOtherProgramTeam: Boolean(otherTeamMembership),
      });
      if (violation) return { status: violation };

      const invitation = await transaction.projectTeamInvitation.upsert({
        where: { projectTeamId_email: { projectTeamId: team.id, email } },
        create: {
          id: randomUUID(),
          projectTeamId: team.id,
          email,
          inviteeId: invitee?.id,
          invitedById: input.actorId,
          status: "PENDING",
          createdAt: input.invitedAt,
          updatedAt: input.invitedAt,
        },
        // 거절하거나 철회한 뒤 다시 부를 수 있다. 같은 줄을 되살린다.
        update: {
          inviteeId: invitee?.id,
          invitedById: input.actorId,
          status: "PENDING",
          respondedAt: null,
          createdAt: input.invitedAt,
          updatedAt: input.invitedAt,
        },
        select: { id: true },
      });

      const title = "프로젝트 팀 초대가 도착했습니다";
      const body = `${team.title} 프로젝트 팀에 초대되었습니다. 내 프로젝트에서 참여 여부를 선택해 주세요.`;
      if (invitee && invitee.accountStatus === "ACTIVE") {
        const dedupeKey = `project-team-invitation:${invitation.id}:${input.invitedAt.getTime()}`;
        await transaction.notification.upsert({
          where: { dedupeKey },
          create: {
            recipientId: invitee.id,
            type: "SYSTEM",
            title,
            body,
            href: "/dashboard",
            dedupeKey,
            createdAt: input.invitedAt,
          },
          update: {},
        });
      }
      // 아직 한 번도 들어온 적 없는 사람도 부를 수 있어야 한다. 그때는 주소로 바로 보낸다.
      const common = {
        kind: "TEAM_INVITATION" as const,
        title,
        body,
        titleEn: "Project team invitation",
        href: "/dashboard",
        idempotencyKey: `project-team-invitation:${invitation.id}:${input.invitedAt.getTime()}`,
        createdAt: input.invitedAt,
      };
      const emailEvent: OutboxEmailEvent = invitee
        ? {
          ...common,
          recipientId: invitee.id,
          bodyEn: `You were invited to the project team for ${team.title}. Choose whether to join from My projects.`,
        }
        : {
          ...common,
          recipientEmail: email,
          bodyEn: `You were invited to the project team for ${team.title}. Sign in to PMS and choose whether to join.`,
        };
      await enqueueEmailEvents(transaction, [emailEvent]);
      return { status: "INVITED" as const };
    });
  }

  cancel(input: { invitationId: string; actorId: string; canceledAt: Date }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const invitation = await transaction.projectTeamInvitation.findFirst({
        where: { id: input.invitationId, status: "PENDING" },
        select: { id: true, projectTeamId: true },
      });
      if (!invitation) return false;
      const team = await this.lockTeam(transaction, invitation.projectTeamId);
      if (!team) return false;
      const isTeamLeader = Boolean(await transaction.projectTeamMembership.findFirst({
        where: { projectTeamId: team.id, userId: input.actorId, role: "LEADER", endedAt: null },
        select: { id: true },
      }));
      if (!team.canSupervise && !isTeamLeader) return false;
      await transaction.projectTeamInvitation.update({
        where: { id: invitation.id },
        data: { status: "CANCELED", respondedAt: input.canceledAt },
      });
      return true;
    });
  }

  respond(input: {
    invitationId: string;
    inviteeId: string;
    inviteeEmail: string;
    accept: boolean;
    respondedAt: Date;
  }): Promise<RespondProjectTeamInvitationOutcome> {
    return this.client.$transaction(async (transaction) => {
      // 계정이 없을 때 보낸 초대는 사람이 비어 있고 주소만 달려 있다. 둘 다로 찾는다.
      const invitation = await transaction.projectTeamInvitation.findFirst({
        where: {
          id: input.invitationId,
          status: "PENDING",
          OR: [{ inviteeId: input.inviteeId }, { email: normalizeInvitationEmail(input.inviteeEmail) }],
        },
        select: { id: true, projectTeamId: true },
      });
      if (!invitation) return "NOT_FOUND";
      const team = await this.lockTeam(transaction, invitation.projectTeamId);
      if (!team || team.status !== "ACTIVE" || !team.confirmedAt) return "NOT_FOUND";

      if (!input.accept) {
        await transaction.projectTeamInvitation.update({
          where: { id: invitation.id },
          data: { status: "DECLINED", respondedAt: input.respondedAt },
        });
        return "DECLINED";
      }

      if (team.programEndsAt <= input.respondedAt) return "PROGRAM_CLOSED";
      // 보낼 때 통과했어도 답하기 전에 상황이 바뀔 수 있고, 검사가 없던 동안 보낸 초대가
      // 남아 있을 수도 있다. 들어가는 순간의 계정과 소속으로 다시 판정한다.
      const invitee = await transaction.user.findUnique({
        where: { id: input.inviteeId },
        select: { role: true, accountStatus: true },
      });
      if (!invitee || !canJoinProjectTeam(invitee)) return "NOT_STUDENT";
      const otherTeamMembership = await transaction.projectTeamMembership.findFirst({
        where: {
          userId: input.inviteeId,
          projectTeamId: { not: team.id },
          ...activeProjectTeamMembershipInProgram(team.programId),
        },
        select: { id: true },
      });
      if (otherTeamMembership) return "ALREADY_IN_PROGRAM_TEAM";
      // 보낼 때 센 정원과 수락할 때의 정원이 다를 수 있다. 들어가는 순간 다시 센다.
      const memberCount = await transaction.projectTeamMembership.count({
        where: { projectTeamId: team.id, endedAt: null },
      });
      if (memberCount >= team.teamMaxSize) return "CAPACITY_REACHED";

      await transaction.projectTeamMembership.create({
        data: {
          projectTeamId: team.id,
          userId: input.inviteeId,
          role: "MEMBER",
          joinedAt: input.respondedAt,
        },
      });
      await transaction.projectTeamInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", respondedAt: input.respondedAt, inviteeId: input.inviteeId },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.inviteeId,
          action: "PROJECT_TEAM_MEMBERSHIP_CORRECTED",
          targetType: "PROJECT_TEAM",
          targetId: team.id,
          metadata: { reason: "INVITATION_ACCEPTED", invitationId: invitation.id },
        },
      });
      return "ACCEPTED";
    });
  }

  async listPending(projectTeamId: string): Promise<ProjectTeamInvitationSummary[]> {
    const invitations = await this.client.projectTeamInvitation.findMany({
      where: { projectTeamId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        createdAt: true,
        invitee: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      inviteeName: invitation.invitee?.name ?? null,
      invitedByName: invitation.invitedBy.name,
      createdAt: invitation.createdAt,
    }));
  }

  async listReceived(inviteeId: string, email: string): Promise<ReceivedProjectTeamInvitation[]> {
    // 계정이 없을 때 보낸 초대는 사람 대신 주소만 달려 있다. 로그인하면 주소로 이어 준다.
    const invitations = await this.client.projectTeamInvitation.findMany({
      where: {
        status: "PENDING",
        OR: [{ inviteeId }, { email: normalizeInvitationEmail(email) }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        invitedBy: { select: { name: true } },
        projectTeam: {
          select: {
            name: true,
            projectId: true,
            project: { select: { title: true, program: { select: { name: true } } } },
          },
        },
      },
    });
    return invitations.map((invitation) => ({
      id: invitation.id,
      projectId: invitation.projectTeam.projectId,
      projectTitle: invitation.projectTeam.project.title,
      teamName: invitation.projectTeam.name,
      programName: invitation.projectTeam.project.program.name,
      invitedByName: invitation.invitedBy.name,
      createdAt: invitation.createdAt,
    }));
  }
}
