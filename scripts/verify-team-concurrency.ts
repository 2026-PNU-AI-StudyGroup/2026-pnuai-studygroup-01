import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaTopicApplicationRepository } from "../src/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_CONCURRENCY_TEST !== "true") {
  throw new Error(
    "ALLOW_LOCAL_CONCURRENCY_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.",
  );
}

const academicYear = 9000 + Math.floor(Math.random() * 1000);
const term = "SECOND" as const;
const professorId = randomUUID();
const studentIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
let createdCycleId: string | null = null;
let createdProgramId: string | null = null;

async function cleanup() {
  if (createdCycleId) {
    await prisma.teamMember.deleteMany({
      where: { academicCycleId: createdCycleId },
    });
    await prisma.topicApplication.deleteMany({
      where: { topic: { academicCycleId: createdCycleId } },
    });
    await prisma.team.deleteMany({
      where: { academicCycleId: createdCycleId },
    });
    await prisma.topic.deleteMany({
      where: { academicCycleId: createdCycleId },
    });
    await prisma.projectProgram.deleteMany({ where: { academicCycleId: createdCycleId } });
    await prisma.academicCycle.deleteMany({
      where: { id: createdCycleId },
    });
    createdCycleId = null;
  }
  await prisma.user.deleteMany({
    where: { id: { in: [professorId, ...studentIds] } },
  });
}

async function createTopic(cycleId: string, title: string, capacity: number) {
  if (!createdProgramId) throw new Error("검증 프로그램이 생성되지 않았습니다.");
  return prisma.topic.create({
    data: {
      academicCycleId: cycleId,
      programId: createdProgramId,
      authorId: professorId,
      title,
      description: "동시성 검증용 주제",
      capacity,
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
}

async function createApplication(topicId: string, studentId: string) {
  return prisma.topicApplication.create({
    data: {
      topicId,
      studentId,
      message: "동시성 검증 지원",
    },
  });
}

async function main() {
  await prisma.user.createMany({
    data: [
      {
        id: professorId,
        name: "Concurrency Professor",
        email: `${professorId}@pusan.ac.kr`,
        emailVerified: true,
        role: "PROFESSOR",
      },
      ...studentIds.map((id) => ({
        id,
        name: "Concurrency Student",
        email: `${id}@pusan.ac.kr`,
        emailVerified: true,
        role: "STUDENT" as const,
      })),
    ],
  });
  const cycle = await prisma.academicCycle.create({
    data: { academicYear, term },
  });
  createdCycleId = cycle.id;
  const program = await prisma.projectProgram.create({ data: {
    academicCycleId: cycle.id, createdById: professorId, name: "동시성 검증 프로그램", category: "검증", description: "동시성 통합 검증",
    startsAt: new Date("2025-01-01"), endsAt: new Date("2027-01-01"), status: "OPEN", openedAt: new Date("2025-01-01"),
  } });
  createdProgramId = program.id;
  const repository = new PrismaTopicApplicationRepository(prisma);
  const actor = { id: professorId, isAdmin: false };

  const capacityTopic = await createTopic(cycle.id, "정원 경합", 1);
  const capacityApplications = await Promise.all([
    createApplication(capacityTopic.id, studentIds[0]),
    createApplication(capacityTopic.id, studentIds[1]),
  ]);
  await Promise.all(
    capacityApplications.map(({ id }) =>
      repository.accept(id, actor, new Date()),
    ),
  );
  const capacityAccepted = await prisma.topicApplication.count({
    where: { topicId: capacityTopic.id, status: "ACCEPTED" },
  });
  const capacityPending = await prisma.topicApplication.count({
    where: { topicId: capacityTopic.id, status: "PENDING" },
  });
  const capacityMembers = await prisma.teamMember.count({
    where: { team: { topicId: capacityTopic.id } },
  });
  if (
    capacityAccepted !== 1 ||
    capacityPending !== 0 ||
    capacityMembers !== 1
  ) {
    throw new Error("정원 동시 수락 불변식이 깨졌습니다.");
  }
  const fullTopicApplication = await repository.createIfAvailable({
    topicId: capacityTopic.id,
    studentId: studentIds[2],
    message: "정원 충족 후 지원",
    skills: ["TypeScript"],
    desiredRole: "개발",
    availability: "평일 저녁",
    appliedAt: new Date("2026-07-13T00:00:00Z"),
  });
  if (fullTopicApplication.outcome !== "TOPIC_UNAVAILABLE") {
    throw new Error("정원이 찬 주제에 신규 지원이 접수되었습니다.");
  }

  const firstTopic = await createTopic(cycle.id, "중복 소속 A", 2);
  const secondTopic = await createTopic(cycle.id, "중복 소속 B", 2);
  const duplicateApplications = await Promise.all([
    createApplication(firstTopic.id, studentIds[2]),
    createApplication(secondTopic.id, studentIds[2]),
  ]);
  await Promise.all(
    duplicateApplications.map(({ id }) =>
      repository.accept(id, actor, new Date()),
    ),
  );
  const studentMemberships = await prisma.teamMember.count({
    where: { academicCycleId: cycle.id, studentId: studentIds[2] },
  });
  const acceptedForStudent = await prisma.topicApplication.count({
    where: { studentId: studentIds[2], status: "ACCEPTED" },
  });
  const pendingForStudent = await prisma.topicApplication.count({
    where: { studentId: studentIds[2], status: "PENDING" },
  });
  if (
    studentMemberships !== 1 ||
    acceptedForStudent !== 1 ||
    pendingForStudent !== 0
  ) {
    throw new Error("동일 학기 단일 팀 소속 불변식이 깨졌습니다.");
  }

  const decisionTopic = await createTopic(cycle.id, "수락 지원 경합 A", 2);
  const applyingTopic = await createTopic(cycle.id, "수락 지원 경합 B", 2);
  const decisionApplication = await createApplication(
    decisionTopic.id,
    studentIds[3],
  );
  await Promise.all([
    repository.accept(decisionApplication.id, actor, new Date()),
    repository.createIfAvailable({
      topicId: applyingTopic.id,
      studentId: studentIds[3],
      message: "수락 중 동시 지원",
      skills: ["TypeScript"],
      desiredRole: "개발",
      availability: "평일 저녁",
      appliedAt: new Date("2026-07-13T00:00:00Z"),
    }),
  ]);
  const decisionRaceMemberships = await prisma.teamMember.count({
    where: { academicCycleId: cycle.id, studentId: studentIds[3] },
  });
  const decisionRacePending = await prisma.topicApplication.count({
    where: { studentId: studentIds[3], status: "PENDING" },
  });
  if (decisionRaceMemberships !== 1 || decisionRacePending !== 0) {
    throw new Error(
      `수락과 신규 지원 경합 불변식이 깨졌습니다: memberships=${decisionRaceMemberships}, pending=${decisionRacePending}`,
    );
  }

  console.log(
    JSON.stringify({
      capacity: { accepted: capacityAccepted, members: capacityMembers },
      singleTeamPerCycle: {
        accepted: acceptedForStudent,
        memberships: studentMemberships,
      },
      acceptApplyRace: {
        memberships: decisionRaceMemberships,
        pending: decisionRacePending,
      },
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
