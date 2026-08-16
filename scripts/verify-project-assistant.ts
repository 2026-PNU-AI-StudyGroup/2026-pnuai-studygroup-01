import "dotenv/config";

import { randomUUID } from "node:crypto";

import { ProjectAssistantCommandService } from "@/modules/project-assistant/application/manage-project-assistants";
import { PrismaProjectAssistantRepository } from "@/modules/project-assistant/infrastructure/prisma-project-assistant-repository";
import { ConfirmTeamService } from "@/modules/team/application/confirm-team";
import { PrismaTeamConfirmationRepository } from "@/modules/team/infrastructure/prisma-team-confirmation-repository";
import { TeamWorkspaceQueryService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceQueryRepository } from "@/modules/team/infrastructure/prisma-team-workspace-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const suffix = randomUUID();
const programId = randomUUID();
const topicId = randomUUID();
const teamId = randomUUID();
const applicationId = randomUUID();
const professorId = `verify-professor-${suffix}`;
const invitees = [
  { id: `verify-student-${suffix}`, role: "STUDENT" as const },
  { id: `verify-professor-assistant-${suffix}`, role: "PROFESSOR" as const },
  { id: `verify-admin-${suffix}`, role: "ADMIN" as const },
];
const userIds = [professorId, ...invitees.map(({ id }) => id)];
const now = new Date();
const startsAt = new Date(now.getTime() - 24 * 60 * 60_000);
const endsAt = new Date(now.getTime() + 90 * 24 * 60 * 60_000);

async function verify() {
  await prisma.user.createMany({
    data: [
      {
        id: professorId,
        name: "검증 지도교수",
        email: `${professorId}@example.com`,
        role: "PROFESSOR",
      },
      ...invitees.map(({ id, role }) => ({
        id,
        name: `검증 ${role}`,
        email: `${id}@example.com`,
        role,
      })),
    ],
  });
  await prisma.projectProgram.create({
    data: {
      id: programId,
      createdById: professorId,
      name: `조교 권한 검증 ${suffix}`,
      category: "검증",
      description: "프로젝트 조교 통합 권한 검증",
      startsAt,
      endsAt,
      projectRegistrationStartsAt: startsAt,
      projectRegistrationEndsAt: endsAt,
      recruitmentStartsAt: startsAt,
      recruitmentEndsAt: endsAt,
      executionStartsAt: now,
      executionEndsAt: new Date(now.getTime() + 60 * 24 * 60 * 60_000),
      isStudentPublic: true,
      isFacultyPublic: true,
    },
  });
  await prisma.topic.create({
    data: {
      id: topicId,
      programId,
      authorId: professorId,
      managerId: professorId,
      title: `조교 권한 검증 ${suffix}`,
      description: "프로젝트 조교 권한 검증",
      capacity: 3,
      status: "ACTIVE",
      applicationQuestions: {
        create: { label: "참여 동기", maxLength: 500, position: 0 },
      },
    },
  });

  const repository = new PrismaProjectAssistantRepository(prisma);
  const commands = new ProjectAssistantCommandService(repository, () => now);
  const manager = {
    id: professorId,
    role: "PROFESSOR" as const,
    name: "검증 지도교수",
    email: `${professorId}@example.com`,
    image: null,
  };

  for (const invitee of invitees) {
    await commands.invite(manager, {
      topicId,
      email: `${invitee.id}@example.com`,
    });
    const invitation = (await repository.listPendingInvitations(invitee.id))[0];
    if (!invitation) throw new Error(`${invitee.role} 조교 초대가 생성되지 않았습니다.`);
    await commands.respond(invitee, invitation.id, "ACCEPT");
  }

  const studentAssistant = invitees[0];
  await prisma.projectTeam.create({
    data: {
      id: teamId,
      projectId: topicId,
      name: "조교 권한 검증 팀",
    },
  });
  await prisma.topicApplication.create({
    data: {
      id: applicationId,
      topicId,
      studentId: studentAssistant.id,
      message: "조교 권한 검증",
      status: "ACCEPTED",
      decidedAt: now,
    },
  });
  await prisma.projectTeamMembership.create({
    data: {
      projectTeamId: teamId,
      userId: studentAssistant.id,
      sourceApplicationId: applicationId,
      role: "LEADER",
    },
  });
  await new ConfirmTeamService(
    new PrismaTeamConfirmationRepository(prisma),
  ).confirm(studentAssistant, teamId);

  for (const invitee of invitees) {
    const workspace = await new TeamWorkspaceQueryService(
      new PrismaTeamWorkspaceQueryRepository(prisma),
    ).get(invitee, topicId);
    if (!workspace.access.canSupervise || !workspace.access.isAssistant) {
      throw new Error(`${invitee.role} 조교에게 감독 권한이 부여되지 않았습니다.`);
    }
  }

  await commands.remove(studentAssistant, topicId, invitees[1].id);
  const removed = await prisma.projectAssistant.findUnique({
    where: {
      topicId_userId: { topicId, userId: invitees[1].id },
    },
  });
  if (removed) throw new Error("조교가 다른 조교의 권한을 해제하지 못했습니다.");

  console.log("project assistant verification passed");
}

async function cleanup() {
  await prisma.notification.deleteMany({ where: { recipientId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.projectTeamMembership.deleteMany({ where: { projectTeamId: teamId } });
  await prisma.projectTeam.deleteMany({ where: { id: teamId } });
  await prisma.topicApplication.deleteMany({ where: { id: applicationId } });
  await prisma.projectAssistantInvitation.deleteMany({ where: { topicId } });
  await prisma.projectAssistant.deleteMany({ where: { topicId } });
  await prisma.topicApplicationQuestion.deleteMany({ where: { topicId } });
  await prisma.topic.deleteMany({ where: { id: topicId } });
  await prisma.projectProgram.deleteMany({ where: { id: programId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

verify()
  .finally(cleanup)
  .finally(() => prisma.$disconnect());
