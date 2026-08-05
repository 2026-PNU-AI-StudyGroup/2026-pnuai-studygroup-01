import "dotenv/config";

import { randomUUID } from "node:crypto";

import { ProjectProgramService } from "../src/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "../src/modules/project-program/infrastructure/prisma-project-program-repository";
import { CreateTopicService } from "../src/modules/topic/application/create-topic";
import { UpdateTopicScheduleService } from "../src/modules/topic/application/update-topic-schedule";
import { PrismaTopicCommandRepository } from "../src/modules/topic/infrastructure/prisma-topic-command-repository";
import { PrismaTopicQueryRepository } from "../src/modules/topic/infrastructure/prisma-topic-query-repository";
import { PrismaTopicApplicationQueryRepository } from "../src/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { PrismaTopicApprovalRepository } from "../src/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_PROGRAM_TEST !== "true") {
  throw new Error("ALLOW_LOCAL_PROGRAM_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.");
}

const adminId = randomUUID();
const professorId = randomUUID();
const leaderId = randomUUID();
const applicantId = randomUUID();

async function cleanup() {
  const createdProgramIds = (await prisma.projectProgram.findMany({
    where: { createdById: adminId },
    select: { id: true },
  })).map(({ id }) => id);
  if (createdProgramIds.length) {
    await prisma.team.deleteMany({ where: { programId: { in: createdProgramIds } } });
    await prisma.topicApplication.deleteMany({ where: { topic: { programId: { in: createdProgramIds } } } });
    await prisma.topic.deleteMany({ where: { programId: { in: createdProgramIds } } });
    await prisma.projectProgram.deleteMany({ where: { id: { in: createdProgramIds } } });
  }
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [adminId, professorId, leaderId, applicantId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, professorId, leaderId, applicantId] } } });
}

async function main() {
  await prisma.user.createMany({ data: [
    { id: adminId, name: "Program Admin", email: `verification+${adminId}@pusan.ac.kr`, emailVerified: true, role: "ADMIN" },
    { id: professorId, name: "Program Professor", email: `verification+${professorId}@pusan.ac.kr`, emailVerified: true, role: "PROFESSOR" },
    { id: leaderId, name: "Program Leader", email: `verification+${leaderId}@pusan.ac.kr`, emailVerified: true, role: "STUDENT" },
    { id: applicantId, name: "Program Applicant", email: `verification+${applicantId}@pusan.ac.kr`, emailVerified: true, role: "STUDENT" },
  ] });
  const now = new Date();
  const day = 24 * 60 * 60_000;
  const programs = new PrismaProjectProgramRepository(prisma);
  const programService = new ProjectProgramService(programs);
  const programName = `자유 프로그램 ${randomUUID()}`;
  await programService.create({ id: adminId, role: "ADMIN" }, {
    name: programName,
    category: "사용자 정의 분류",
    description: "하드코딩 없는 동적 프로그램 검증",
    startsAt: new Date(now.getTime() - day),
    endsAt: new Date(now.getTime() + 90 * day),
    advisorEnabled: true,
    studentProjectCreationEnabled: false,
  });
  const program = await prisma.projectProgram.findFirstOrThrow({ where: { name: programName } });
  await programService.changeStatus({ id: adminId, role: "ADMIN" }, program.id, "OPEN", now);

  const topicCommands = new PrismaTopicCommandRepository(prisma);
  const topicQueries = new PrismaTopicQueryRepository(prisma);
  const topic = await new CreateTopicService(topicCommands, programs).execute({ id: professorId, role: "PROFESSOR" }, {
    programId: program.id,
    title: "동적 프로그램 주제",
    description: "프로그램과 주제 연결 검증",
    requiredSkills: ["TypeScript"],
    preferredSkills: [],
    roleExpectations: "구현",
    availabilityRequirement: "주 1회 회의",
    applicationMode: "INDIVIDUAL_ONLY",
    applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
    capacity: 3,
    recruitmentStartsAt: new Date(now.getTime() - 60 * 60_000),
    recruitmentEndsAt: new Date(now.getTime() + 30 * day),
    executionStartsAt: new Date(now.getTime() + 20 * day),
    executionEndsAt: new Date(now.getTime() + 70 * day),
    submissionStartsAt: new Date(now.getTime() + 60 * day),
    submissionEndsAt: new Date(now.getTime() + 80 * day),
  });
  if (!(await topicCommands.publishDraft(topic.id, { id: professorId, role: "PROFESSOR" }, now))) throw new Error("공개 프로그램의 주제를 공개하지 못했습니다.");
  const filtered = await topicQueries.listPublished({ programId: program.id, query: "", phase: "ACTIVE", sort: "LATEST", page: 1, pageSize: 10, now });
  if (filtered.total !== 1 || filtered.items[0]?.programName !== program.name) throw new Error("프로그램별 주제 필터가 일치하지 않습니다.");
  const changedSchedule = {
    recruitmentStartsAt: new Date(now.getTime() - 30 * 60_000),
    recruitmentEndsAt: new Date(now.getTime() + 40 * day),
    executionStartsAt: new Date(now.getTime() + 10 * day),
    executionEndsAt: new Date(now.getTime() + 75 * day),
    submissionStartsAt: new Date(now.getTime() + 65 * day),
    submissionEndsAt: new Date(now.getTime() + 85 * day),
  };
  await new UpdateTopicScheduleService(topicCommands).execute(
    { id: professorId, role: "PROFESSOR" },
    topic.id,
    changedSchedule,
  );
  const scheduledTopic = await prisma.topic.findUniqueOrThrow({ where: { id: topic.id } });
  if (scheduledTopic.recruitmentEndsAt.getTime() !== changedSchedule.recruitmentEndsAt.getTime()) {
    throw new Error("주제 작성자가 변경한 일정이 저장되지 않았습니다.");
  }

  const accepted = await prisma.topicApplication.create({ data: { topicId: topic.id, studentId: leaderId, message: "팀장", status: "ACCEPTED", decidedAt: now } });
  const pending = await prisma.topicApplication.create({ data: { topicId: topic.id, studentId: applicantId, message: "지원", status: "PENDING" } });
  const searched = await topicQueries.listPublished({ viewerId: applicantId, programId: program.id, query: "typescript", phase: "ACTIVE", sort: "LATEST", page: 1, pageSize: 10, now });
  if (searched.total !== 1 || searched.items[0]?.ownApplicationStatus !== "PENDING") {
    throw new Error("기술 검색 또는 현재 학생의 지원 상태 조회가 일치하지 않습니다.");
  }
  const escapedSearch = await topicQueries.listPublished({ programId: program.id, query: "%", phase: "ACTIVE", sort: "LATEST", page: 1, pageSize: 10, now });
  if (escapedSearch.total !== 0) throw new Error("검색 와일드카드가 일반 문자로 처리되지 않았습니다.");
  const team = await prisma.team.create({ data: { programId: program.id, topicId: topic.id, professorId, name: "프로그램 검증 팀" } });
  await prisma.teamMember.create({ data: { teamId: team.id, programId: program.id, topicId: topic.id, studentId: leaderId, applicationId: accepted.id } });
  const post = await prisma.recruitmentPost.create({ data: { teamId: team.id, authorId: leaderId, title: "팀원 모집", content: "내용", roleNeeded: "개발", availability: "주 1회" } });
  await prisma.recruitmentApplication.create({ data: { postId: post.id, topicApplicationId: pending.id, studentId: applicantId } });
  const pendingApprovalTopic = await prisma.topic.create({ data: {
    programId: program.id,
    authorId: applicantId,
    managerId: null,
    title: "프로그램 종료 승인 요청 검증",
    description: "프로그램 종료 시 대기 승인 요청도 함께 종료되는지 검증",
    capacity: 2,
    recruitmentStartsAt: new Date(now.getTime() - 60 * 60_000),
    recruitmentEndsAt: new Date(now.getTime() + 30 * day),
    executionStartsAt: new Date(now.getTime() + 20 * day),
    executionEndsAt: new Date(now.getTime() + 70 * day),
    submissionStartsAt: new Date(now.getTime() + 60 * day),
    submissionEndsAt: new Date(now.getTime() + 80 * day),
    status: "DRAFT",
    approvalRequest: {
      create: {
        requesterId: applicantId,
        route: "ADMIN",
        status: "PENDING",
      },
    },
  }, include: { approvalRequest: true } });

  await programService.changeStatus({ id: adminId, role: "ADMIN" }, program.id, "CLOSED", new Date(now.getTime() + 1_000));
  const [closedTopic, rejectedTopicApplication, closedPost, rejectedRecruitmentApplication, rejectedApprovalRequest] = await Promise.all([
    prisma.topic.findUniqueOrThrow({ where: { id: topic.id } }),
    prisma.topicApplication.findUniqueOrThrow({ where: { id: pending.id } }),
    prisma.recruitmentPost.findUniqueOrThrow({ where: { id: post.id } }),
    prisma.recruitmentApplication.findUniqueOrThrow({ where: { topicApplicationId: pending.id } }),
    prisma.topicApprovalRequest.findUniqueOrThrow({ where: { id: pendingApprovalTopic.approvalRequest!.id } }),
  ]);
  if (closedTopic.status !== "CLOSED" || rejectedTopicApplication.status !== "REJECTED" || closedPost.status !== "CLOSED" || rejectedRecruitmentApplication.status !== "REJECTED" || rejectedApprovalRequest.status !== "REJECTED") {
    throw new Error("프로그램 마감 하위 상태 동기화가 실패했습니다.");
  }
  const topicHistory = await new PrismaTopicApplicationQueryRepository(prisma).listByStudent(applicantId, 1, 20);
  if (topicHistory.items[0]?.topicStatus !== "CLOSED" || topicHistory.items[0]?.status !== "REJECTED") {
    throw new Error("마감된 주제 지원 이력을 학생이 조회할 수 없습니다.");
  }
  if (await topicCommands.publishDraft(topic.id, { id: professorId, role: "PROFESSOR" }, new Date(now.getTime() + 2_000))) throw new Error("마감 프로그램의 주제가 다시 공개되었습니다.");

  const raceName = `마감 경합 프로그램 ${randomUUID()}`;
  await programService.create({ id: adminId, role: "ADMIN" }, {
    name: raceName, category: "경합 검증", description: "주제 생성과 프로그램 마감 경합",
    startsAt: new Date(now.getTime() - day), endsAt: new Date(now.getTime() + 90 * day),
    advisorEnabled: true,
    studentProjectCreationEnabled: false,
  });
  const raceProgram = await prisma.projectProgram.findFirstOrThrow({ where: { name: raceName } });
  await programService.changeStatus({ id: adminId, role: "ADMIN" }, raceProgram.id, "OPEN", now);
  const race = await Promise.allSettled([
    new CreateTopicService(topicCommands, programs).execute({ id: professorId, role: "PROFESSOR" }, {
      programId: raceProgram.id, title: "마감 경합 주제", description: "원자적 생성 검증", requiredSkills: ["TypeScript"], preferredSkills: [],
      roleExpectations: "구현", availabilityRequirement: "주 1회", capacity: 2,
      applicationMode: "INDIVIDUAL_ONLY", applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
      recruitmentStartsAt: new Date(now.getTime() - 60 * 60_000), recruitmentEndsAt: new Date(now.getTime() + 30 * day),
      executionStartsAt: new Date(now.getTime() + 20 * day), executionEndsAt: new Date(now.getTime() + 70 * day),
      submissionStartsAt: new Date(now.getTime() + 60 * day), submissionEndsAt: new Date(now.getTime() + 80 * day),
    }),
    programService.changeStatus({ id: adminId, role: "ADMIN" }, raceProgram.id, "CLOSED", new Date(now.getTime() + 3_000)),
  ]);
  if (race[1].status !== "fulfilled") throw race[1].reason;
  const publishedRaceTopics = await prisma.topic.count({ where: { programId: raceProgram.id, status: "PUBLISHED" } });
  if (publishedRaceTopics !== 0) throw new Error("프로그램 마감과 주제 생성 경합 후 공개 주제가 남았습니다.");

  const approvalRaceName = `승인 마감 경합 프로그램 ${randomUUID()}`;
  await programService.create({ id: adminId, role: "ADMIN" }, {
    name: approvalRaceName, category: "경합 검증", description: "학생 제안 생성 및 승인과 프로그램 마감 경합",
    startsAt: new Date(now.getTime() - day), endsAt: new Date(now.getTime() + 90 * day),
    advisorEnabled: true,
    studentProjectCreationEnabled: true,
  });
  const approvalRaceProgram = await prisma.projectProgram.findFirstOrThrow({ where: { name: approvalRaceName } });
  await programService.changeStatus({ id: adminId, role: "ADMIN" }, approvalRaceProgram.id, "OPEN", now);
  const topicApprovals = new PrismaTopicApprovalRepository(prisma);
  const proposalInput = {
    programId: approvalRaceProgram.id,
    authorId: applicantId,
    description: "프로그램 마감과 학생 제안 처리의 원자성 검증",
    requiredSkills: ["TypeScript"],
    preferredSkills: [],
    roleExpectations: "구현",
    availabilityRequirement: "주 1회",
    applicationMode: "INDIVIDUAL_ONLY" as const,
    applicationQuestions: [{ label: "참여 동기", maxLength: 500, required: true }],
    capacity: 2,
    recruitmentStartsAt: new Date(now.getTime() - 60 * 60_000),
    recruitmentEndsAt: new Date(now.getTime() + 30 * day),
    executionStartsAt: new Date(now.getTime() + 20 * day),
    executionEndsAt: new Date(now.getTime() + 70 * day),
    submissionStartsAt: new Date(now.getTime() + 60 * day),
    submissionEndsAt: new Date(now.getTime() + 80 * day),
    route: "ADMIN" as const,
    requestedProfessorId: null,
  };
  const approvalRaceTopicId = await topicApprovals.create({
    ...proposalInput,
    title: "승인 마감 경합 기존 제안",
    requestedAt: now,
  });
  if (!approvalRaceTopicId) throw new Error("승인 마감 경합용 학생 제안을 생성하지 못했습니다.");
  const approvalRaceRequest = await prisma.topicApprovalRequest.findUniqueOrThrow({
    where: { topicId: approvalRaceTopicId },
  });
  const approvalCloseRace = await Promise.allSettled([
    topicApprovals.decide({
      requestId: approvalRaceRequest.id,
      actorId: adminId,
      actorRole: "ADMIN",
      decision: "APPROVE",
      reviewComment: "경합 승인",
      decidedAt: new Date(now.getTime() + 4_000),
    }),
    topicApprovals.create({
      ...proposalInput,
      title: "승인 마감 경합 동시 생성",
      requestedAt: new Date(now.getTime() + 4_000),
    }),
    programService.changeStatus({ id: adminId, role: "ADMIN" }, approvalRaceProgram.id, "CLOSED", new Date(now.getTime() + 5_000)),
  ]);
  if (approvalCloseRace[2].status !== "fulfilled") throw approvalCloseRace[2].reason;
  if (approvalCloseRace[0].status !== "fulfilled") throw approvalCloseRace[0].reason;
  if (approvalCloseRace[1].status !== "fulfilled") throw approvalCloseRace[1].reason;
  const [approvalRaceProgramState, approvalRacePublishedTopics, approvalRacePendingRequests] = await Promise.all([
    prisma.projectProgram.findUniqueOrThrow({ where: { id: approvalRaceProgram.id } }),
    prisma.topic.count({ where: { programId: approvalRaceProgram.id, status: "PUBLISHED" } }),
    prisma.topicApprovalRequest.count({ where: { topic: { programId: approvalRaceProgram.id }, status: "PENDING" } }),
  ]);
  if (
    approvalRaceProgramState.status !== "CLOSED" ||
    approvalRacePublishedTopics !== 0 ||
    approvalRacePendingRequests !== 0 ||
    !["APPROVED", "UNAVAILABLE"].includes(approvalCloseRace[0].value)
  ) {
    throw new Error(
      `학생 제안 처리와 프로그램 마감 경합 불변식이 깨졌습니다: program=${approvalRaceProgramState.status}, published=${approvalRacePublishedTopics}, pendingApprovals=${approvalRacePendingRequests}, approval=${approvalCloseRace[0].value}`,
    );
  }

  console.log(JSON.stringify({ program: "CLOSED", topic: closedTopic.status, topicScheduleUpdated: true, technologySearch: searched.total, escapedWildcardSearch: escapedSearch.total, ownApplicationStatus: searched.items[0]?.ownApplicationStatus, topicApplication: rejectedTopicApplication.status, topicApplicationHistory: topicHistory.total, recruitmentPost: closedPost.status, recruitmentApplication: rejectedRecruitmentApplication.status, topicApprovalRequest: rejectedApprovalRequest.status, closeCreateRacePublishedTopics: publishedRaceTopics, approvalCloseRace: { approval: approvalCloseRace[0].value, createdTopic: approvalCloseRace[1].value !== null, publishedTopics: approvalRacePublishedTopics, pendingRequests: approvalRacePendingRequests } }));
}

main()
  .finally(async () => { await cleanup(); await prisma.$disconnect(); })
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
