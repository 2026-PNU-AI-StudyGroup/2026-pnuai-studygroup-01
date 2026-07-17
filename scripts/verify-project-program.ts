import "dotenv/config";

import { randomUUID } from "node:crypto";

import { ProjectProgramService } from "../src/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "../src/modules/project-program/infrastructure/prisma-project-program-repository";
import { CreateTopicService } from "../src/modules/topic/application/create-topic";
import { UpdateTopicScheduleService } from "../src/modules/topic/application/update-topic-schedule";
import { PrismaTopicRepository } from "../src/modules/topic/infrastructure/prisma-topic-repository";
import { PrismaTopicApplicationRepository } from "../src/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { PrismaRecruitmentRepository } from "../src/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_PROGRAM_TEST !== "true") {
  throw new Error("ALLOW_LOCAL_PROGRAM_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.");
}

const adminId = randomUUID();
const professorId = randomUUID();
const leaderId = randomUUID();
const applicantId = randomUUID();
let cycleId: string | null = null;

async function cleanup() {
  if (cycleId) {
    await prisma.team.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.topicApplication.deleteMany({ where: { topic: { academicCycleId: cycleId } } });
    await prisma.topic.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.projectProgram.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.academicCycle.deleteMany({ where: { id: cycleId } });
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
  const cycle = await prisma.academicCycle.create({ data: { academicYear: 6000 + Math.floor(Math.random() * 1000), term: "FIRST" } });
  cycleId = cycle.id;

  const now = new Date();
  const day = 24 * 60 * 60_000;
  const programs = new PrismaProjectProgramRepository(prisma);
  const programService = new ProjectProgramService(programs);
  await programService.create({ id: adminId, role: "ADMIN" }, {
    academicCycleId: cycle.id,
    name: `자유 프로그램 ${randomUUID()}`,
    category: "사용자 정의 분류",
    description: "하드코딩 없는 동적 프로그램 검증",
    startsAt: new Date(now.getTime() - day),
    endsAt: new Date(now.getTime() + 90 * day),
  });
  const program = await prisma.projectProgram.findFirstOrThrow({ where: { academicCycleId: cycle.id } });
  await programService.changeStatus({ id: adminId, role: "ADMIN" }, program.id, "OPEN", now);

  const topics = new PrismaTopicRepository(prisma);
  const topic = await new CreateTopicService(topics, programs).execute({ id: professorId, role: "PROFESSOR" }, {
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
  if (!(await topics.publishDraft(topic.id, now))) throw new Error("공개 프로그램의 주제를 공개하지 못했습니다.");
  const filtered = await topics.listPublished({ programId: program.id, query: "", phase: "ACTIVE", sort: "LATEST", page: 1, pageSize: 10, now });
  if (filtered.total !== 1 || filtered.items[0]?.programName !== program.name) throw new Error("프로그램별 주제 필터가 일치하지 않습니다.");
  const changedSchedule = {
    recruitmentStartsAt: new Date(now.getTime() - 30 * 60_000),
    recruitmentEndsAt: new Date(now.getTime() + 40 * day),
    executionStartsAt: new Date(now.getTime() + 10 * day),
    executionEndsAt: new Date(now.getTime() + 75 * day),
    submissionStartsAt: new Date(now.getTime() + 65 * day),
    submissionEndsAt: new Date(now.getTime() + 85 * day),
  };
  await new UpdateTopicScheduleService(topics).execute(
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
  const searched = await topics.listPublished({ viewerId: applicantId, programId: program.id, query: "typescript", phase: "ACTIVE", sort: "LATEST", page: 1, pageSize: 10, now });
  if (searched.total !== 1 || searched.items[0]?.ownApplicationStatus !== "PENDING") {
    throw new Error("기술 검색 또는 현재 학생의 지원 상태 조회가 일치하지 않습니다.");
  }
  const escapedSearch = await topics.listPublished({ programId: program.id, query: "%", phase: "ACTIVE", sort: "LATEST", page: 1, pageSize: 10, now });
  if (escapedSearch.total !== 0) throw new Error("검색 와일드카드가 일반 문자로 처리되지 않았습니다.");
  const team = await prisma.team.create({ data: { academicCycleId: cycle.id, topicId: topic.id, professorId, name: "프로그램 검증 팀" } });
  await prisma.teamMember.create({ data: { teamId: team.id, academicCycleId: cycle.id, topicId: topic.id, studentId: leaderId, applicationId: accepted.id } });
  const post = await prisma.recruitmentPost.create({ data: { teamId: team.id, authorId: leaderId, title: "팀원 모집", content: "내용", roleNeeded: "개발", availability: "주 1회" } });
  await prisma.recruitmentApplication.create({ data: { postId: post.id, topicApplicationId: pending.id, studentId: applicantId } });

  await programService.changeStatus({ id: adminId, role: "ADMIN" }, program.id, "CLOSED", new Date(now.getTime() + 1_000));
  const [closedTopic, rejectedTopicApplication, closedPost, rejectedRecruitmentApplication] = await Promise.all([
    prisma.topic.findUniqueOrThrow({ where: { id: topic.id } }),
    prisma.topicApplication.findUniqueOrThrow({ where: { id: pending.id } }),
    prisma.recruitmentPost.findUniqueOrThrow({ where: { id: post.id } }),
    prisma.recruitmentApplication.findUniqueOrThrow({ where: { topicApplicationId: pending.id } }),
  ]);
  if (closedTopic.status !== "CLOSED" || rejectedTopicApplication.status !== "REJECTED" || closedPost.status !== "CLOSED" || rejectedRecruitmentApplication.status !== "REJECTED") {
    throw new Error("프로그램 마감 하위 상태 동기화가 실패했습니다.");
  }
  const [topicHistory, recruitmentHistory] = await Promise.all([
    new PrismaTopicApplicationRepository(prisma).listByStudent(applicantId, 1, 20),
    new PrismaRecruitmentRepository(prisma).listApplicationHistory(applicantId, 1),
  ]);
  if (topicHistory.items[0]?.topicStatus !== "CLOSED" || topicHistory.items[0]?.status !== "REJECTED") {
    throw new Error("마감된 주제 지원 이력을 학생이 조회할 수 없습니다.");
  }
  if (recruitmentHistory.applications[0]?.status !== "REJECTED") {
    throw new Error("마감된 팀원 모집 지원 이력을 학생이 조회할 수 없습니다.");
  }
  if (await topics.publishDraft(topic.id, new Date(now.getTime() + 2_000))) throw new Error("마감 프로그램의 주제가 다시 공개되었습니다.");

  const raceName = `마감 경합 프로그램 ${randomUUID()}`;
  await programService.create({ id: adminId, role: "ADMIN" }, {
    academicCycleId: cycle.id, name: raceName, category: "경합 검증", description: "주제 생성과 프로그램 마감 경합",
    startsAt: new Date(now.getTime() - day), endsAt: new Date(now.getTime() + 90 * day),
  });
  const raceProgram = await prisma.projectProgram.findFirstOrThrow({ where: { academicCycleId: cycle.id, name: raceName } });
  await programService.changeStatus({ id: adminId, role: "ADMIN" }, raceProgram.id, "OPEN", now);
  const race = await Promise.allSettled([
    new CreateTopicService(topics, programs).execute({ id: professorId, role: "PROFESSOR" }, {
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

  console.log(JSON.stringify({ program: "CLOSED", topic: closedTopic.status, topicScheduleUpdated: true, technologySearch: searched.total, escapedWildcardSearch: escapedSearch.total, ownApplicationStatus: searched.items[0]?.ownApplicationStatus, topicApplication: rejectedTopicApplication.status, topicApplicationHistory: topicHistory.total, recruitmentPost: closedPost.status, recruitmentApplication: rejectedRecruitmentApplication.status, recruitmentApplicationHistory: recruitmentHistory.total, closeCreateRacePublishedTopics: publishedRaceTopics }));
}

main()
  .finally(async () => { await cleanup(); await prisma.$disconnect(); })
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
