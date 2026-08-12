import "dotenv/config";

import { randomUUID } from "node:crypto";

import {
  ConfirmTeamService,
  TeamConfirmationNotAllowedError,
} from "../src/modules/team/application/confirm-team";
import {
  TeamDiscussionService,
  TeamTaskService,
  TaskNotFoundError,
  TeamNotFoundError,
  TeamWorkspaceQueryService,
} from "../src/modules/team/application/manage-team-workspace";
import { PrismaTeamConfirmationRepository } from "../src/modules/team/infrastructure/prisma-team-confirmation-repository";
import { PrismaTeamDiscussionRepository } from "../src/modules/team/infrastructure/prisma-team-discussion-repository";
import { PrismaTeamTaskRepository } from "../src/modules/team/infrastructure/prisma-team-task-repository";
import { PrismaTeamWorkspaceQueryRepository } from "../src/modules/team/infrastructure/prisma-team-workspace-query-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_WORKSPACE_TEST !== "true") {
  throw new Error(
    "ALLOW_LOCAL_WORKSPACE_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.",
  );
}

const professorId = randomUUID();
const studentId = randomUUID();
const outsiderId = randomUUID();
let programId: string | null = null;

async function cleanup() {
  if (programId) {
    await prisma.team.deleteMany({ where: { programId } });
    await prisma.topicApplication.deleteMany({
      where: { topic: { programId } },
    });
    await prisma.topic.deleteMany({ where: { programId } });
    await prisma.projectProgram.deleteMany({ where: { id: programId } });
    programId = null;
  }
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [professorId, studentId, outsiderId] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [professorId, studentId, outsiderId] } },
  });
}

async function expectRejected(
  operation: () => Promise<unknown>,
  ErrorType: typeof TeamNotFoundError | typeof TaskNotFoundError,
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
        email: `verification+${professorId}@pusan.ac.kr`,
        emailVerified: true,
        role: "PROFESSOR",
      },
      {
        id: studentId,
        name: "Workspace Student",
        email: `verification+${studentId}@pusan.ac.kr`,
        emailVerified: true,
        role: "STUDENT",
      },
      {
        id: outsiderId,
        name: "Workspace Outsider",
        email: `verification+${outsiderId}@pusan.ac.kr`,
        emailVerified: true,
        role: "STUDENT",
      },
    ],
  });
  const program = await prisma.projectProgram.create({ data: {
    createdById: professorId, name: `워크스페이스 검증 프로그램 ${professorId}`, category: "검증", description: "워크스페이스 통합 검증",
    startsAt: new Date("2025-01-01"), endsAt: new Date("2027-01-01"), projectRegistrationStartsAt: new Date("2025-01-01"), projectRegistrationEndsAt: new Date("2027-01-01"), recruitmentStartsAt: new Date("2025-01-01"), recruitmentEndsAt: new Date("2027-01-01"), executionStartsAt: new Date("2025-01-01"), executionEndsAt: new Date("2027-01-01"), submissionStartsAt: new Date("2025-01-01"), submissionEndsAt: new Date("2027-01-01"), isPublic: true, firstPublishedAt: new Date("2025-01-01"),
  } });
  programId = program.id;
  const topic = await prisma.topic.create({
    data: {
      programId: program.id,
      authorId: professorId,
      managerId: professorId,
      title: "워크스페이스 검증 주제",
      description: "워크스페이스 통합 검증",
      capacity: 2,
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
      programId: program.id,
      topicId: topic.id,
      professorId,
      name: "워크스페이스 검증 팀",
    },
  });
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      programId: program.id,
      topicId: topic.id,
      studentId,
      applicationId: application.id,
    },
  });

  const queryService = new TeamWorkspaceQueryService(
    new PrismaTeamWorkspaceQueryRepository(prisma),
  );
  const taskService = new TeamTaskService(
    new PrismaTeamTaskRepository(prisma),
  );
  const discussionService = new TeamDiscussionService(
    new PrismaTeamDiscussionRepository(prisma),
  );
  const professor = { id: professorId, role: "PROFESSOR" as const };
  const student = { id: studentId, role: "STUDENT" as const };
  const outsider = { id: outsiderId, role: "STUDENT" as const };
  const confirmation = new ConfirmTeamService(
    new PrismaTeamConfirmationRepository(prisma),
  );

  try {
    await confirmation.confirm(student, team.id);
    throw new Error("학생이 팀을 확정했습니다.");
  } catch (error) {
    if (!(error instanceof TeamConfirmationNotAllowedError)) throw error;
  }
  await confirmation.confirm(professor, team.id);

  const task = await taskService.createTask(student, {
    teamId: team.id,
    title: "  중간 발표  ",
    dueAt: new Date("2026-08-01T00:00:00Z"),
  });
  await discussionService.createDiscussionPost(student, {
    teamId: team.id,
    content: "  Can we meet on Friday?  ",
  });
  await expectRejected(
    () => discussionService.createDiscussionPost(outsider, {
      teamId: team.id,
      content: "권한 없는 토론",
    }),
    TeamNotFoundError,
  );
  await expectRejected(
    () => taskService.createTask(outsider, {
      teamId: team.id,
      title: "권한 없는 할 일",
      dueAt: new Date("2026-08-02T00:00:00Z"),
    }),
    TeamNotFoundError,
  );
  await expectRejected(
    () => taskService.updateTask(outsider, {
      taskId: task.id,
      title: "중간 발표",
      dueAt: new Date("2026-08-01T00:00:00Z"),
      status: "DONE",
    }),
    TaskNotFoundError,
  );
  await expectRejected(
    () => queryService.get({ id: professorId, role: "STUDENT" }, team.id),
    TeamNotFoundError,
  );
  await taskService.updateTask(student, {
    taskId: task.id,
    title: "중간 발표",
    dueAt: new Date("2026-08-01T00:00:00Z"),
    status: "DONE",
  });

  const workspace = await queryService.get(student, team.id);
  if (
    workspace.taskCount !== 1 ||
    workspace.completedTaskCount !== 1 ||
    workspace.discussionPosts[0]?.content !== "Can we meet on Friday?" ||
    workspace.members[0]?.email !== `verification+${studentId}@pusan.ac.kr`
  ) {
    throw new Error("워크스페이스 조회 결과가 저장 결과와 일치하지 않습니다.");
  }

  const olderCreatedAt = new Date("2026-07-01T00:00:00.000Z");
  await prisma.discussionPost.createMany({
    data: Array.from({ length: 50 }, (_, index) => ({
      teamId: team.id,
      authorId: student.id,
      content: `이전 토론 ${index + 1}`,
      createdAt: olderCreatedAt,
    })),
  });
  const secondHistoryPage = await queryService.get(student, team.id, 2);
  if (
    secondHistoryPage.discussionPage !== 2 ||
    secondHistoryPage.discussionTotal !== 51 ||
    secondHistoryPage.discussionPosts.length !== 1
  ) {
    throw new Error("대화의 이전 이력 페이지를 조회할 수 없습니다.");
  }
  const boundedHistoryPage = await queryService.get(student, team.id, 999);
  if (boundedHistoryPage.discussionPage !== 2) {
    throw new Error("범위를 벗어난 이력 페이지가 마지막 페이지로 정규화되지 않았습니다.");
  }

  console.log(
    JSON.stringify({
      authorizedRead: true,
      unauthorizedRead: "NOT_FOUND",
      unauthorizedWrite: "NOT_FOUND",
      demotedProfessorRead: "NOT_FOUND",
      professorTeamConfirmation: true,
      tasks: workspace.taskCount,
      completedTasks: workspace.completedTaskCount,
      discussionHistory: { total: secondHistoryPage.discussionTotal, pages: secondHistoryPage.discussionTotalPages },
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
