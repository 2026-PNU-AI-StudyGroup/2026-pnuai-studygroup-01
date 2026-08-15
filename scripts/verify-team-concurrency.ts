import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaTopicApplicationDecisionRepository } from "../src/modules/topic-application/infrastructure/prisma-topic-application-decision-repository";
import { PrismaTopicApplicationSubmissionRepository } from "../src/modules/topic-application/infrastructure/prisma-topic-application-submission-repository";
import { PrismaStudentTeamCommandRepository } from "../src/modules/student-team/infrastructure/prisma-student-team-command-repository";
import { PrismaTopicApprovalRepository } from "../src/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_CONCURRENCY_TEST !== "true") {
  throw new Error(
    "ALLOW_LOCAL_CONCURRENCY_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.",
  );
}

const professorId = randomUUID();
const studentIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const proposalStudentId = randomUUID();
let createdProgramId: string | null = null;
let crossProgramId: string | null = null;

async function cleanup() {
  const programIds = [createdProgramId, crossProgramId].filter((id): id is string => id !== null);
  if (programIds.length) {
    await prisma.projectTeamMembership.deleteMany({
      where: { projectTeam: { project: { programId: { in: programIds } } } },
    });
    await prisma.topicApplication.deleteMany({
      where: { topic: { programId: { in: programIds } } },
    });
    await prisma.projectTeam.deleteMany({
      where: { project: { programId: { in: programIds } } },
    });
    await prisma.topic.deleteMany({
      where: { programId: { in: programIds } },
    });
    await prisma.projectProgram.deleteMany({ where: { id: { in: programIds } } });
    createdProgramId = null;
    crossProgramId = null;
  }
  await prisma.studentTeam.deleteMany({
    where: { leaderId: { in: [proposalStudentId, ...studentIds] } },
  });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [professorId, ...studentIds, proposalStudentId] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [professorId, ...studentIds, proposalStudentId] } },
  });
}

async function createTopic(title: string, capacity: number, programId = createdProgramId) {
  if (!programId) throw new Error("검증 프로그램이 생성되지 않았습니다.");
  return prisma.topic.create({
    data: {
      programId,
      authorId: professorId,
      managerId: professorId,
      title,
      description: "동시성 검증용 주제",
      applicationMode: "INDIVIDUAL_ONLY",
      capacity,
      status: "ACTIVE",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      applicationQuestions: { create: { label: "지원 동기", maxLength: 500, required: true, position: 0 } },
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
        email: `verification+${professorId}@pusan.ac.kr`,
        emailVerified: true,
        role: "PROFESSOR",
      },
      ...studentIds.map((id) => ({
        id,
        name: "Concurrency Student",
        email: `verification+${id}@pusan.ac.kr`,
        emailVerified: true,
        role: "STUDENT" as const,
      })),
      {
        id: proposalStudentId,
        name: "Proposal Concurrency Student",
        email: `verification+${proposalStudentId}@pusan.ac.kr`,
        emailVerified: true,
        role: "STUDENT" as const,
      },
    ],
  });
  const program = await prisma.projectProgram.create({ data: {
    createdById: professorId, name: `동시성 검증 프로그램 ${professorId}`, category: "검증", description: "동시성 통합 검증",
    startsAt: new Date("2025-01-01"), endsAt: new Date("2027-01-01"), projectRegistrationStartsAt: new Date("2025-01-01"), projectRegistrationEndsAt: new Date("2027-01-01"), recruitmentStartsAt: new Date("2025-01-01"), recruitmentEndsAt: new Date("2027-01-01"), executionStartsAt: new Date("2025-01-01"), executionEndsAt: new Date("2027-01-01"), submissionStartsAt: new Date("2025-01-01"), submissionEndsAt: new Date("2027-01-01"), studentProjectCreationEnabled: true, isStudentPublic: true, isFacultyPublic: true, firstPublishedAt: new Date("2025-01-01"),
  } });
  createdProgramId = program.id;
  const decisionRepository = new PrismaTopicApplicationDecisionRepository(prisma);
  const submissionRepository = new PrismaTopicApplicationSubmissionRepository(prisma);
  const approvalRepository = new PrismaTopicApprovalRepository(prisma);
  const studentTeamRepository = new PrismaStudentTeamCommandRepository(prisma);
  const actor = { id: professorId, isAdmin: false };

  const capacityTopic = await createTopic("정원 경합", 1);
  const capacityApplications = await Promise.all([
    createApplication(capacityTopic.id, studentIds[0]),
    createApplication(capacityTopic.id, studentIds[1]),
  ]);
  await Promise.all(
    capacityApplications.map(({ id }) =>
      decisionRepository.accept(id, actor, new Date()),
    ),
  );
  const capacityAccepted = await prisma.topicApplication.count({
    where: { topicId: capacityTopic.id, status: "ACCEPTED" },
  });
  const capacityPending = await prisma.topicApplication.count({
    where: { topicId: capacityTopic.id, status: "PENDING" },
  });
  const capacityMembers = await prisma.projectTeamMembership.count({
    where: { projectTeam: { projectId: capacityTopic.id } },
  });
  if (
    capacityAccepted !== 1 ||
    capacityPending !== 0 ||
    capacityMembers !== 1
  ) {
    throw new Error("정원 동시 수락 불변식이 깨졌습니다.");
  }
  const fullTopicConfiguration = await submissionRepository.findConfiguration(capacityTopic.id, new Date("2026-07-13T00:00:00Z"));
  if (!fullTopicConfiguration) throw new Error("정원 검증 주제 설정을 찾지 못했습니다.");
  const fullTopicApplication = await submissionRepository.createIndividualIfAvailable({
    topicId: capacityTopic.id,
    studentId: studentIds[2],
    studentEmail: `verification+${studentIds[2]}@pusan.ac.kr`,
    kind: "INDIVIDUAL",
    answers: [{ questionId: fullTopicConfiguration.questions[0].id, value: "정원 충족 후 지원" }],
    appliedAt: new Date("2026-07-13T00:00:00Z"),
  });
  if (fullTopicApplication.outcome !== "TOPIC_UNAVAILABLE") {
    throw new Error("정원이 찬 주제에 신규 지원이 접수되었습니다.");
  }

  const firstTopic = await createTopic("중복 소속 A", 2);
  const secondTopic = await createTopic("중복 소속 B", 2);
  const duplicateApplications = await Promise.all([
    createApplication(firstTopic.id, studentIds[2]),
    createApplication(secondTopic.id, studentIds[2]),
  ]);
  await Promise.all(
    duplicateApplications.map(({ id }) =>
      decisionRepository.accept(id, actor, new Date()),
    ),
  );
  const studentMemberships = await prisma.projectTeamMembership.count({
    where: { projectTeam: { project: { programId: program.id } }, userId: studentIds[2], endedAt: null },
  });
  const acceptedForStudent = await prisma.topicApplication.count({
    where: { studentId: studentIds[2], status: "ACCEPTED" },
  });
  const pendingForStudent = await prisma.topicApplication.count({
    where: { studentId: studentIds[2], status: "PENDING" },
  });
  if (
    studentMemberships !== 2 ||
    acceptedForStudent !== 2 ||
    pendingForStudent !== 0
  ) {
    throw new Error("동일 프로그램 복수 프로젝트 참여 계약이 깨졌습니다.");
  }

  const crossProgram = await prisma.projectProgram.create({ data: {
    createdById: professorId, name: `교차 프로그램 검증 ${professorId}`, category: "검증", description: "교차 프로그램 참여 검증",
    startsAt: new Date("2025-01-01"), endsAt: new Date("2027-01-01"), projectRegistrationStartsAt: new Date("2025-01-01"), projectRegistrationEndsAt: new Date("2027-01-01"), recruitmentStartsAt: new Date("2025-01-01"), recruitmentEndsAt: new Date("2027-01-01"), executionStartsAt: new Date("2025-01-01"), executionEndsAt: new Date("2027-01-01"), submissionStartsAt: new Date("2025-01-01"), submissionEndsAt: new Date("2027-01-01"), studentProjectCreationEnabled: true, isStudentPublic: true, isFacultyPublic: true, firstPublishedAt: new Date("2025-01-01"),
  } });
  crossProgramId = crossProgram.id;
  const crossProgramTopic = await createTopic("교차 프로그램 참여", 2, crossProgram.id);
  const crossProgramApplication = await createApplication(crossProgramTopic.id, studentIds[2]);
  const crossProgramOutcome = await decisionRepository.accept(crossProgramApplication.id, actor, new Date());
  const crossProgramMemberships = await prisma.projectTeamMembership.count({
    where: {
      userId: studentIds[2],
      endedAt: null,
      projectTeam: { project: { programId: { in: [program.id, crossProgram.id] } } },
    },
  });
  if (crossProgramOutcome !== "ACCEPTED" || crossProgramMemberships !== 3) {
    throw new Error(
      `서로 다른 프로그램 참여 계약이 깨졌습니다: outcome=${crossProgramOutcome}, memberships=${crossProgramMemberships}`,
    );
  }

  const decisionTopic = await createTopic("수락 지원 경합 A", 2);
  const applyingTopic = await createTopic("수락 지원 경합 B", 2);
  const decisionApplication = await createApplication(
    decisionTopic.id,
    studentIds[3],
  );
  await Promise.all([
    decisionRepository.accept(decisionApplication.id, actor, new Date()),
    submissionRepository.findConfiguration(applyingTopic.id, new Date("2026-07-13T00:00:00Z")).then((configuration) => {
      if (!configuration) throw new Error("지원 경합 검증 주제 설정을 찾지 못했습니다.");
      return submissionRepository.createIndividualIfAvailable({
      topicId: applyingTopic.id,
      studentId: studentIds[3],
      studentEmail: `verification+${studentIds[3]}@pusan.ac.kr`,
      kind: "INDIVIDUAL",
      answers: [{ questionId: configuration.questions[0].id, value: "수락 중 동시 지원" }],
      appliedAt: new Date("2026-07-13T00:00:00Z"),
      });
    }),
  ]);
  const decisionRaceMemberships = await prisma.projectTeamMembership.count({
    where: { projectTeam: { project: { programId: program.id } }, userId: studentIds[3], endedAt: null },
  });
  const decisionRacePending = await prisma.topicApplication.count({
    where: { studentId: studentIds[3], status: "PENDING" },
  });
  if (decisionRaceMemberships !== 1 || decisionRacePending !== 1) {
    throw new Error(
      `수락과 신규 지원 경합 불변식이 깨졌습니다: memberships=${decisionRaceMemberships}, pending=${decisionRacePending}`,
    );
  }

  const oppositeDecisionTopic = await createTopic("수락 거절 경합", 1);
  const oppositeDecisionApplication = await createApplication(oppositeDecisionTopic.id, studentIds[4]);
  await Promise.all([
    decisionRepository.accept(oppositeDecisionApplication.id, actor, new Date()),
    decisionRepository.reject(oppositeDecisionApplication.id, actor, new Date()),
  ]);
  const oppositeDecisionState = await prisma.topicApplication.findUniqueOrThrow({
    where: { id: oppositeDecisionApplication.id },
    select: { status: true },
  });
  const oppositeDecisionMembers = await prisma.projectTeamMembership.count({ where: { projectTeam: { projectId: oppositeDecisionTopic.id } } });
  if (
    oppositeDecisionState.status === "PENDING" ||
    (oppositeDecisionState.status === "ACCEPTED" && oppositeDecisionMembers !== 1) ||
    (oppositeDecisionState.status === "REJECTED" && oppositeDecisionMembers !== 0)
  ) {
    throw new Error(`수락과 거절 경합 불변식이 깨졌습니다: status=${oppositeDecisionState.status}, members=${oppositeDecisionMembers}`);
  }

  const proposalStudentTeamId = await studentTeamRepository.create({
    leaderId: proposalStudentId,
    name: "승인 삭제 경합 팀",
    description: "프로젝트 승인과 기존 팀 삭제 잠금 순서 검증",
    createdAt: new Date("2026-07-01T00:00:00Z"),
  });
  const proposalTopicId = await approvalRepository.create({
    programId: program.id,
    authorId: proposalStudentId,
    title: "기존 팀 승인 삭제 경합",
    description: "기존 팀 제안 승인과 팀 삭제가 교착 없이 일관되게 끝나는지 검증",
    requiredSkills: ["TypeScript"],
    preferredSkills: [],
    roleExpectations: "구현",
    availabilityRequirement: "주 1회",
    applicationMode: "INDIVIDUAL_ONLY",
    applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
    capacity: 1,
    route: "PROFESSOR",
    requestedProfessorId: professorId,
    studentTeamId: proposalStudentTeamId,
    requestedAt: new Date("2026-07-01T00:00:00Z"),
  });
  if (!proposalTopicId) throw new Error("기존 팀 승인 삭제 경합용 제안을 만들지 못했습니다.");
  const proposalRequest = await prisma.topicApprovalRequest.findFirstOrThrow({
    where: { topicId: proposalTopicId, status: "PENDING" },
  });
  const approvalDeleteRace = await Promise.allSettled([
    approvalRepository.decide({
      requestId: proposalRequest.id,
      actorId: professorId,
      actorRole: "PROFESSOR",
      decision: "APPROVE",
      reviewComment: "경합 승인",
      decidedAt: new Date("2026-07-02T00:00:00Z"),
    }),
    studentTeamRepository.delete({
      teamId: proposalStudentTeamId,
      leaderId: proposalStudentId,
      deletedAt: new Date("2026-07-02T00:00:00Z"),
    }),
  ]);
  if (approvalDeleteRace[0].status !== "fulfilled") throw approvalDeleteRace[0].reason;
  if (approvalDeleteRace[1].status !== "fulfilled") throw approvalDeleteRace[1].reason;
  const [proposalTopicState, proposalRequestState, proposalMemberships] = await Promise.all([
    prisma.topic.findUniqueOrThrow({ where: { id: proposalTopicId } }),
    prisma.topicApprovalRequest.findUniqueOrThrow({ where: { id: proposalRequest.id } }),
    prisma.projectTeamMembership.count({ where: { projectTeam: { project: { programId: program.id } }, userId: proposalStudentId, endedAt: null } }),
  ]);
  const approvalDeleteOutcome = approvalDeleteRace[0].value;
  const approvalWon = approvalDeleteOutcome === "APPROVED";
  if (
    approvalDeleteRace[1].value !== true ||
    !["APPROVED", "UNAVAILABLE"].includes(approvalDeleteOutcome) ||
    proposalRequestState.status === "PENDING" ||
    (approvalWon && (proposalTopicState.status !== "ACTIVE" || proposalRequestState.status !== "APPROVED" || proposalMemberships !== 1)) ||
    (!approvalWon && (proposalTopicState.status !== "REJECTED" || proposalRequestState.status !== "REJECTED" || proposalMemberships !== 0))
  ) {
    throw new Error(
      `기존 팀 승인과 삭제 경합 불변식이 깨졌습니다: approval=${approvalDeleteOutcome}, deleted=${approvalDeleteRace[1].value}, topic=${proposalTopicState.status}, request=${proposalRequestState.status}, memberships=${proposalMemberships}`,
    );
  }

  const memberRemovalTeamId = await studentTeamRepository.create({
    leaderId: studentIds[3],
    name: "승인 팀원 제거 경합 팀",
    description: "프로젝트 승인과 개별 팀원 제거 잠금 순서 검증",
    createdAt: new Date("2026-07-03T00:00:00Z"),
  });
  await prisma.studentTeamMember.create({
    data: {
      teamId: memberRemovalTeamId,
      studentId: studentIds[4],
      role: "MEMBER",
      joinedAt: new Date("2026-07-03T00:00:00Z"),
    },
  });
  const memberRemovalTopicId = await approvalRepository.create({
    programId: crossProgram.id,
    authorId: studentIds[3],
    title: "기존 팀 승인 팀원 제거 경합",
    description: "기존 팀 제안 승인과 개별 팀원 제거가 동일한 팀 구성으로 직렬화되는지 검증",
    requiredSkills: ["TypeScript"],
    preferredSkills: [],
    roleExpectations: "구현",
    availabilityRequirement: "주 1회",
    applicationMode: "INDIVIDUAL_ONLY",
    applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
    capacity: 2,
    route: "PROFESSOR",
    requestedProfessorId: professorId,
    studentTeamId: memberRemovalTeamId,
    requestedAt: new Date("2026-07-03T00:00:00Z"),
  });
  if (!memberRemovalTopicId) throw new Error("기존 팀 승인 팀원 제거 경합용 제안을 만들지 못했습니다.");
  const memberRemovalRequest = await prisma.topicApprovalRequest.findFirstOrThrow({
    where: { topicId: memberRemovalTopicId, status: "PENDING" },
  });
  const approvalMemberRemovalRace = await Promise.allSettled([
    approvalRepository.decide({
      requestId: memberRemovalRequest.id,
      actorId: professorId,
      actorRole: "PROFESSOR",
      decision: "APPROVE",
      reviewComment: "경합 승인",
      decidedAt: new Date("2026-07-04T00:00:00Z"),
    }),
    studentTeamRepository.removeMember({
      teamId: memberRemovalTeamId,
      leaderId: studentIds[3],
      studentId: studentIds[4],
      changedAt: new Date("2026-07-04T00:00:00Z"),
    }),
  ]);
  if (approvalMemberRemovalRace[0].status !== "fulfilled") throw approvalMemberRemovalRace[0].reason;
  if (approvalMemberRemovalRace[1].status !== "fulfilled") throw approvalMemberRemovalRace[1].reason;
  const [memberRemovalTopicState, memberRemovalRequestState, memberRemovalMemberships] = await Promise.all([
    prisma.topic.findUniqueOrThrow({ where: { id: memberRemovalTopicId } }),
    prisma.topicApprovalRequest.findUniqueOrThrow({ where: { id: memberRemovalRequest.id } }),
    prisma.projectTeamMembership.count({ where: { projectTeam: { projectId: memberRemovalTopicId } } }),
  ]);
  const memberRemovalApprovalOutcome = approvalMemberRemovalRace[0].value;
  const memberRemovalApprovalWon = memberRemovalApprovalOutcome === "APPROVED";
  if (
    approvalMemberRemovalRace[1].value !== true ||
    !["APPROVED", "UNAVAILABLE"].includes(memberRemovalApprovalOutcome) ||
    (memberRemovalApprovalWon && (memberRemovalTopicState.status !== "ACTIVE" || memberRemovalRequestState.status !== "APPROVED" || memberRemovalMemberships !== 2)) ||
    (!memberRemovalApprovalWon && (memberRemovalTopicState.status !== "PENDING_APPROVAL" || memberRemovalRequestState.status !== "PENDING" || memberRemovalMemberships !== 0))
  ) {
    throw new Error(
      `기존 팀 승인과 팀원 제거 경합 불변식이 깨졌습니다: approval=${memberRemovalApprovalOutcome}, removed=${approvalMemberRemovalRace[1].value}, topic=${memberRemovalTopicState.status}, request=${memberRemovalRequestState.status}, memberships=${memberRemovalMemberships}`,
    );
  }

  console.log(
    JSON.stringify({
      capacity: { accepted: capacityAccepted, members: capacityMembers },
      singleTeamPerProgram: {
        accepted: acceptedForStudent,
        memberships: studentMemberships,
      },
      crossProgramMembership: {
        outcome: crossProgramOutcome,
        memberships: crossProgramMemberships,
      },
      acceptApplyRace: {
        memberships: decisionRaceMemberships,
        pending: decisionRacePending,
      },
      oppositeDecisionRace: {
        status: oppositeDecisionState.status,
        members: oppositeDecisionMembers,
      },
      approvalDeleteRace: {
        approval: approvalDeleteOutcome,
        topic: proposalTopicState.status,
        request: proposalRequestState.status,
        memberships: proposalMemberships,
      },
      approvalMemberRemovalRace: {
        approval: memberRemovalApprovalOutcome,
        topic: memberRemovalTopicState.status,
        request: memberRemovalRequestState.status,
        memberships: memberRemovalMemberships,
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
