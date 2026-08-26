import "dotenv/config";

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaProjectTeamInvitationRepository } from "@/modules/project-team/infrastructure/prisma-project-team-invitation-repository";

const runIntegration = process.env.PROJECT_TEAM_INVITATION_INTEGRATION_TEST === "true" ? it : it.skip;

describe("PrismaProjectTeamInvitationRepository 프로젝트 팀 초대", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    if (!process.env.PROJECT_TEAM_INVITATION_INTEGRATION_TEST) return;
    ({ prisma } = await import("@/shared/infrastructure/database/prisma"));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  runIntegration("초대를 보내고 수락하면 팀원이 되고, 정원이 차면 더 부르지 못한다", async () => {
    const client = prisma;
    if (!client) throw new Error("DATABASE_URL 환경변수가 필요합니다.");

    const suffix = randomUUID().slice(0, 8);
    const adminId = `admin-${suffix}`;
    const leaderId = `leader-${suffix}`;
    const inviteeId = `invitee-${suffix}`;
    const inviteeEmail = `invitee-${suffix}@pusan.ac.kr`;
    const programId = randomUUID();
    const topicId = randomUUID();
    const teamId = randomUUID();
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    const userIds = [adminId, leaderId, inviteeId];

    const cleanup = async () => {
      await client.projectTeamInvitation.deleteMany({ where: { projectTeamId: teamId } });
      await client.projectTeamMembership.deleteMany({ where: { projectTeamId: teamId } });
      await client.emailDelivery.deleteMany({ where: { recipientEmail: inviteeEmail } });
      await client.notification.deleteMany({ where: { recipientId: { in: userIds } } });
      await client.auditLog.deleteMany({ where: { targetId: teamId } });
      await client.projectTeam.deleteMany({ where: { id: teamId } });
      await client.topic.deleteMany({ where: { programId } });
      await client.projectProgram.deleteMany({ where: { id: programId } });
      await client.user.deleteMany({ where: { id: { in: userIds } } });
    };

    await cleanup();
    try {
      await client.user.createMany({
        data: [
          { id: adminId, name: "초대 검증 관리자", email: `admin-${suffix}@pusan.ac.kr`, role: "ADMIN" },
          { id: leaderId, name: "초대 검증 팀장", email: `leader-${suffix}@pusan.ac.kr`, role: "STUDENT" },
          { id: inviteeId, name: "초대 검증 팀원", email: inviteeEmail, role: "STUDENT" },
        ],
      });
      await client.projectProgram.create({
        data: {
          id: programId,
          name: `초대 검증 프로그램 ${suffix}`,
          category: "초대 검증",
          startsAt: past,
          endsAt: future,
          projectRegistrationStartsAt: past,
          projectRegistrationEndsAt: future,
          recruitmentStartsAt: past,
          recruitmentEndsAt: future,
          executionStartsAt: past,
          executionEndsAt: future,
          isPublic: true,
          // 팀 최대 인원 2명. 팀장 한 명이 이미 있으니 한 자리만 남는다.
          // 주제의 모집 정원은 일부러 넉넉히 둬서 이 값이 아니라 프로그램 값으로 막히는지 본다.
          projectTeamMaxSize: 2,
          topics: {
            create: [{ id: topicId, authorId: adminId, title: "초대 검증 주제", description: "설명", capacity: 9, status: "ACTIVE", publishedAt: past }],
          },
        },
      });
      await client.projectTeam.create({
        data: {
          id: teamId,
          projectId: topicId,
          name: `초대 검증 팀 ${suffix}`,
          confirmedAt: past,
          memberships: { create: [{ userId: leaderId, role: "LEADER", joinedAt: past }] },
        },
      });

      const admin = { id: adminId, role: "ADMIN" as const, name: "초대 검증 관리자", email: `admin-${suffix}@pusan.ac.kr`, image: null };
      const repository = new PrismaProjectTeamInvitationRepository(client, admin);

      expect(await repository.invite({ projectTeamId: teamId, actorId: adminId, email: inviteeEmail, invitedAt: new Date() }))
        .toEqual({ status: "INVITED" });

      // 남은 한 자리를 대기 중인 초대가 이미 잡고 있으므로 더 부를 수 없다.
      expect(await repository.invite({ projectTeamId: teamId, actorId: adminId, email: `other-${suffix}@pusan.ac.kr`, invitedAt: new Date() }))
        .toEqual({ status: "CAPACITY_REACHED" });

      const pending = await repository.listPending(teamId);
      expect(pending).toHaveLength(1);
      expect(pending[0]!.email).toBe(inviteeEmail);

      const received = await repository.listReceived(inviteeId, inviteeEmail);
      expect(received.map(({ id }) => id)).toEqual([pending[0]!.id]);

      expect(await repository.respond({
        invitationId: pending[0]!.id,
        inviteeId,
        inviteeEmail,
        accept: true,
        respondedAt: new Date(),
      })).toBe("ACCEPTED");

      const members = await client.projectTeamMembership.findMany({
        where: { projectTeamId: teamId, endedAt: null },
        select: { userId: true, role: true },
      });
      expect(members.map(({ userId }) => userId).sort()).toEqual([inviteeId, leaderId].sort());
      expect(members.find(({ userId }) => userId === inviteeId)?.role).toBe("MEMBER");
      // 수락한 초대는 목록에서 빠진다.
      expect(await repository.listPending(teamId)).toHaveLength(0);
    } finally {
      await cleanup();
    }
  }, 30_000);
});
