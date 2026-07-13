import "dotenv/config";

import { randomUUID } from "node:crypto";

import {
  MilestoneNotFoundError,
  TeamNotFoundError,
  TeamWorkspaceService,
} from "../src/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceRepository } from "../src/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_WORKSPACE_TEST !== "true") {
  throw new Error(
    "ALLOW_LOCAL_WORKSPACE_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.",
  );
}

const professorId = randomUUID();
const studentId = randomUUID();
const outsiderId = randomUUID();
let cycleId: string | null = null;

async function cleanup() {
  if (cycleId) {
    await prisma.team.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.topicApplication.deleteMany({
      where: { topic: { academicCycleId: cycleId } },
    });
    await prisma.topic.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.academicCycle.deleteMany({ where: { id: cycleId } });
    cycleId = null;
  }
  await prisma.user.deleteMany({
    where: { id: { in: [professorId, studentId, outsiderId] } },
  });
}

async function expectRejected(
  operation: () => Promise<unknown>,
  ErrorType: typeof TeamNotFoundError | typeof MilestoneNotFoundError,
) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof ErrorType) return;
    throw error;
  }
  throw new Error(`${ErrorType.name}가 발생하지 않았습니다.`);
}

async function main() {
  await prisma.user.createMany({
    data: [
      {
        id: professorId,
        name: "Workspace Professor",
        email: `${professorId}@pusan.ac.kr`,
        emailVerified: true,
        role: "PROFESSOR",
      },
      {
        id: studentId,
        name: "Workspace Student",
        email: `${studentId}@pusan.ac.kr`,
        emailVerified: true,
        role: "STUDENT",
      },
      {
        id: outsiderId,
        name: "Workspace Outsider",
        email: `${outsiderId}@pusan.ac.kr`,
        emailVerified: true,
        role: "STUDENT",
      },
    ],
  });
  const cycle = await prisma.academicCycle.create({
    data: {
      academicYear: 9000 + Math.floor(Math.random() * 1000),
      term: "FIRST",
    },
  });
  cycleId = cycle.id;
  const topic = await prisma.topic.create({
    data: {
      academicCycleId: cycle.id,
      authorId: professorId,
      title: "워크스페이스 검증 주제",
      description: "워크스페이스 통합 검증",
      capacity: 2,
      recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-12-31T00:00:00Z"),
      executionStartsAt: new Date("2026-01-01T00:00:00Z"),
      executionEndsAt: new Date("2026-12-31T00:00:00Z"),
      submissionStartsAt: new Date("2026-01-01T00:00:00Z"),
      submissionEndsAt: new Date("2026-12-31T00:00:00Z"),
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
    },
  });
  const application = await prisma.topicApplication.create({
    data: {
      topicId: topic.id,
      studentId,
      message: "워크스페이스 검증 지원",
      status: "ACCEPTED",
      decidedAt: new Date(),
    },
  });
  const team = await prisma.team.create({
    data: {
      academicCycleId: cycle.id,
      topicId: topic.id,
      professorId,
      name: "워크스페이스 검증 팀",
    },
  });
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      academicCycleId: cycle.id,
      topicId: topic.id,
      studentId,
      applicationId: application.id,
    },
  });

  const repository = new PrismaTeamWorkspaceRepository(prisma);
  const service = new TeamWorkspaceService(repository, repository, repository);
  const professor = { id: professorId, role: "PROFESSOR" as const };
  const student = { id: studentId, role: "STUDENT" as const };
  const outsider = { id: outsiderId, role: "STUDENT" as const };

  const milestone = await service.createMilestone(student, {
    teamId: team.id,
    title: "  중간 발표  ",
    dueAt: new Date("2026-08-01T00:00:00Z"),
  });
  await service.createProgressUpdate(professor, {
    teamId: team.id,
    content: "  요구사항 분석 완료  ",
    risk: "",
    nextAction: "도메인 모델 구현",
  });
  await expectRejected(
    () => service.createMilestone(outsider, {
      teamId: team.id,
      title: "권한 없는 마일스톤",
      dueAt: new Date("2026-08-02T00:00:00Z"),
    }),
    TeamNotFoundError,
  );
  await expectRejected(
    () => service.updateMilestoneStatus(outsider, {
      milestoneId: milestone.id,
      status: "DONE",
    }),
    MilestoneNotFoundError,
  );
  await expectRejected(
    () => service.get({ id: professorId, role: "STUDENT" }, team.id),
    TeamNotFoundError,
  );
  await service.updateMilestoneStatus(student, {
    milestoneId: milestone.id,
    status: "DONE",
  });

  const workspace = await service.get(student, team.id);
  if (
    workspace.milestoneCount !== 1 ||
    workspace.completedMilestoneCount !== 1 ||
    workspace.progressUpdates.length !== 1 ||
    workspace.members[0]?.email !== `${studentId}@pusan.ac.kr`
  ) {
    throw new Error("워크스페이스 조회 결과가 저장 결과와 일치하지 않습니다.");
  }

  console.log(
    JSON.stringify({
      authorizedRead: true,
      unauthorizedRead: "NOT_FOUND",
      unauthorizedWrite: "NOT_FOUND",
      demotedProfessorRead: "NOT_FOUND",
      milestones: workspace.milestoneCount,
      completedMilestones: workspace.completedMilestoneCount,
      progressUpdates: workspace.progressUpdates.length,
    }),
  );
}

main()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
