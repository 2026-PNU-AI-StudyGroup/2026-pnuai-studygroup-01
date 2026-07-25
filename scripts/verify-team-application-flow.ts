import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaProjectProgramRepository } from "../src/modules/project-program/infrastructure/prisma-project-program-repository";
import { PrismaRecruitmentRepository } from "../src/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTeamApplicationInvitationRepository } from "../src/modules/topic-application/infrastructure/prisma-team-application-invitation-repository";
import { PrismaTopicApplicationDecisionRepository } from "../src/modules/topic-application/infrastructure/prisma-topic-application-decision-repository";
import { PrismaTopicApplicationSubmissionRepository } from "../src/modules/topic-application/infrastructure/prisma-topic-application-submission-repository";
import { PrismaTopicRepository } from "../src/modules/topic/infrastructure/prisma-topic-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";

if (process.env.ALLOW_LOCAL_TEAM_APPLICATION_TEST !== "true") {
  throw new Error("ALLOW_LOCAL_TEAM_APPLICATION_TEST=true인 격리된 로컬 DB에서만 실행할 수 있습니다.");
}

const professorId = randomUUID();
const studentIds = Array.from({ length: 10 }, () => randomUUID());
const emails = studentIds.map((id) => `verification+${id}@pusan.ac.kr`);
const academicYear = 10_000 + Math.floor(Math.random() * 10_000);
let cycleId: string | null = null;

async function cleanup() {
  await prisma.notification.deleteMany({ where: { recipientId: { in: studentIds } } });
  if (cycleId) {
    await prisma.team.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.teamApplicationDraft.deleteMany({ where: { topic: { academicCycleId: cycleId } } });
    await prisma.topicApplicationGroup.deleteMany({ where: { topic: { academicCycleId: cycleId } } });
    await prisma.topicApplication.deleteMany({ where: { topic: { academicCycleId: cycleId } } });
    await prisma.topic.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.projectProgram.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.academicCycle.deleteMany({ where: { id: cycleId } });
  }
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [professorId, ...studentIds] } } });
  await prisma.user.deleteMany({ where: { id: { in: [professorId, ...studentIds] } } });
}

async function createTopic(programId: string, mode: "TEAM_ONLY" | "INDIVIDUAL_ONLY", capacity = mode === "TEAM_ONLY" ? 3 : 1) {
  if (!cycleId) throw new Error("검증 학기가 생성되지 않았습니다.");
  return prisma.topic.create({
    data: {
      academicCycleId: cycleId,
      programId,
      authorId: professorId,
      title: `${mode} 지원 흐름 검증`,
      description: "개인 및 팀 지원 트랜잭션 검증",
      requiredSkills: ["TypeScript"],
      preferredSkills: [],
      roleExpectations: "지원 흐름 검증",
      availabilityRequirement: "검증 시간 참여",
      applicationMode: mode,
      capacity,
      recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2027-01-01T00:00:00Z"),
      executionStartsAt: new Date("2026-01-01T00:00:00Z"),
      executionEndsAt: new Date("2027-01-01T00:00:00Z"),
      submissionStartsAt: new Date("2026-01-01T00:00:00Z"),
      submissionEndsAt: new Date("2027-01-01T00:00:00Z"),
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      applicationQuestions: {
        create: [{ label: "지원 동기", maxLength: 500, required: true, position: 0 }],
      },
    },
    select: { id: true, applicationQuestions: { select: { id: true } } },
  });
}

async function main() {
  await prisma.user.createMany({
    data: [
      { id: professorId, name: "지원 검증 교수", email: `verification+${professorId}@pusan.ac.kr`, emailVerified: true, role: "PROFESSOR" },
      ...studentIds.map((id, index) => ({ id, name: `지원 검증 학생 ${index + 1}`, email: emails[index], emailVerified: true, role: "STUDENT" as const })),
    ],
  });
  const cycle = await prisma.academicCycle.create({ data: { academicYear, term: "SECOND" } });
  cycleId = cycle.id;
  const program = await prisma.projectProgram.create({
    data: {
      academicCycleId: cycle.id,
      createdById: professorId,
      name: "지원 흐름 검증 프로그램",
      category: "검증",
      description: "팀 지원 원자성 검증",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2027-01-01T00:00:00Z"),
      status: "OPEN",
      openedAt: new Date("2026-01-01T00:00:00Z"),
    },
  });
  const decisionRepository = new PrismaTopicApplicationDecisionRepository(prisma);
  const invitationRepository = new PrismaTeamApplicationInvitationRepository(prisma);
  const submissionRepository = new PrismaTopicApplicationSubmissionRepository(prisma);
  const appliedAt = new Date("2026-07-17T00:00:00Z");

  const invalidInviteTopic = await createTopic(program.id, "TEAM_ONLY");
  const invalidRoleInvite = await submissionRepository.createTeamDraftIfAvailable({
    topicId: invalidInviteTopic.id,
    studentId: studentIds[8],
    studentEmail: emails[8],
    kind: "TEAM",
    answers: [{ questionId: invalidInviteTopic.applicationQuestions[0].id, value: "교수 계정 초대 차단 검증" }],
    inviteeEmails: [`verification+${professorId}@pusan.ac.kr`],
    appliedAt,
  });
  if (invalidRoleInvite.outcome !== "TEAM_MEMBER_UNAVAILABLE") throw new Error("학생이 아닌 등록 계정의 팀 초대를 차단하지 못했습니다.");

  const roleChangeTopic = await createTopic(program.id, "TEAM_ONLY", 3);
  const roleChangeDraft = await submissionRepository.createTeamDraftIfAvailable({
    topicId: roleChangeTopic.id,
    studentId: studentIds[8],
    studentEmail: emails[8],
    kind: "TEAM",
    answers: [{ questionId: roleChangeTopic.applicationQuestions[0].id, value: "승격 시 역할 재검증" }],
    inviteeEmails: [emails[7], emails[9]],
    appliedAt,
  });
  if (roleChangeDraft.outcome !== "INVITATIONS_PENDING") throw new Error("역할 변경 검증 팀 초안 생성 실패");
  const roleInvitations = await prisma.teamApplicationInvitation.findMany({ where: { draftId: roleChangeDraft.draftId }, orderBy: { email: "asc" } });
  const firstRoleInvitation = roleInvitations.find(({ email }) => email === emails[9]);
  const finalRoleInvitation = roleInvitations.find(({ email }) => email === emails[7]);
  if (!firstRoleInvitation || !finalRoleInvitation) throw new Error("역할 변경 검증 초대 조회 실패");
  if (await invitationRepository.respond(firstRoleInvitation.id, { id: studentIds[9], email: emails[9] }, "ACCEPT", appliedAt) !== "PENDING") throw new Error("역할 변경 전 첫 수락 실패");
  await prisma.user.update({ where: { id: studentIds[9] }, data: { role: "PROFESSOR" } });
  const roleChangePromotion = await invitationRepository.respond(finalRoleInvitation.id, { id: studentIds[7], email: emails[7] }, "ACCEPT", appliedAt);
  if (roleChangePromotion !== "MEMBER_UNAVAILABLE" || await prisma.topicApplication.count({ where: { topicId: roleChangeTopic.id } })) {
    throw new Error("승격 시 학생 역할 재검증에 실패했습니다.");
  }
  await prisma.user.update({ where: { id: studentIds[9] }, data: { role: "STUDENT" } });
  await invitationRepository.cancelDraft(roleChangeDraft.draftId, studentIds[8]);

  const individualTopic = await createTopic(program.id, "INDIVIDUAL_ONLY");
  const individual = await submissionRepository.createIndividualIfAvailable({
    topicId: individualTopic.id,
    studentId: studentIds[0],
    studentEmail: emails[0],
    kind: "INDIVIDUAL",
    answers: [{ questionId: individualTopic.applicationQuestions[0].id, value: "개인 지원 검증" }],
    inviteeEmails: [],
    appliedAt,
  });
  if (individual.outcome !== "CREATED") throw new Error(`개인 지원 생성 실패: ${individual.outcome}`);

  const teamTopic = await createTopic(program.id, "TEAM_ONLY");
  const draft = await submissionRepository.createTeamDraftIfAvailable({
    topicId: teamTopic.id,
    studentId: studentIds[1],
    studentEmail: emails[1],
    kind: "TEAM",
    answers: [{ questionId: teamTopic.applicationQuestions[0].id, value: "팀 지원 검증" }],
    inviteeEmails: [emails[2], emails[3]],
    appliedAt,
  });
  if (draft.outcome !== "INVITATIONS_PENDING") throw new Error(`팀 초안 생성 실패: ${draft.outcome}`);
  const invitations = await prisma.teamApplicationInvitation.findMany({ where: { draftId: draft.draftId }, orderBy: { email: "asc" } });
  const actorByEmail = new Map(emails.map((email, index) => [email, { id: studentIds[index], email }]));
  const firstActor = actorByEmail.get(invitations[0].email);
  const secondActor = actorByEmail.get(invitations[1].email);
  if (!firstActor || !secondActor) throw new Error("팀원 초대 대상 매핑 실패");
  const firstAcceptance = await invitationRepository.respond(invitations[0].id, firstActor, "ACCEPT", appliedAt);
  const applicationCountBeforeAllAccepted = await prisma.topicApplication.count({ where: { topicId: teamTopic.id } });
  if (firstAcceptance !== "PENDING" || applicationCountBeforeAllAccepted !== 0) {
    throw new Error("모든 팀원 수락 전에 실제 지원서가 생성되었습니다.");
  }
  const finalAcceptance = await invitationRepository.respond(invitations[1].id, secondActor, "ACCEPT", appliedAt);
  const teamApplications = await prisma.topicApplication.findMany({ where: { topicId: teamTopic.id }, orderBy: { participantRole: "asc" } });
  if (finalAcceptance !== "APPLICATION_CREATED" || teamApplications.length !== 3) {
    throw new Error("마지막 팀원 수락 후 팀 지원서 생성에 실패했습니다.");
  }
  const leaderApplication = teamApplications.find(({ participantRole }) => participantRole === "LEADER");
  if (!leaderApplication) throw new Error("팀 대표 지원서를 찾지 못했습니다.");
  const legacyConflict = await prisma.topicApplication.create({
    data: { topicId: teamTopic.id, studentId: studentIds[0], message: "정원 충족 시 자동 거절할 기존 지원" },
  });
  const decision = await decisionRepository.accept(leaderApplication.id, { id: professorId, isAdmin: false }, appliedAt);
  const [acceptedCount, memberCount, legacyConflictAfterDecision] = await Promise.all([
    prisma.topicApplication.count({ where: { topicId: teamTopic.id, status: "ACCEPTED" } }),
    prisma.teamMember.count({ where: { topicId: teamTopic.id } }),
    prisma.topicApplication.findUniqueOrThrow({ where: { id: legacyConflict.id }, select: { status: true } }),
  ]);
  if (decision !== "ACCEPTED" || acceptedCount !== 3 || memberCount !== 3 || legacyConflictAfterDecision.status !== "REJECTED") {
    throw new Error("교수 수락 시 팀 전체 원자 배정에 실패했습니다.");
  }

  const rejectedTopic = await createTopic(program.id, "TEAM_ONLY");
  const rejectedDraft = await submissionRepository.createTeamDraftIfAvailable({
    topicId: rejectedTopic.id,
    studentId: studentIds[4],
    studentEmail: emails[4],
    kind: "TEAM",
    answers: [{ questionId: rejectedTopic.applicationQuestions[0].id, value: "팀 거절 검증" }],
    inviteeEmails: [emails[5]],
    appliedAt,
  });
  if (rejectedDraft.outcome !== "INVITATIONS_PENDING") throw new Error("거절 검증 팀 초안 생성 실패");
  const rejectedInvitation = await prisma.teamApplicationInvitation.findFirstOrThrow({ where: { draftId: rejectedDraft.draftId } });
  const promoted = await invitationRepository.respond(rejectedInvitation.id, { id: studentIds[5], email: emails[5] }, "ACCEPT", appliedAt);
  if (promoted !== "APPLICATION_CREATED") throw new Error("거절 검증 팀 지원 승격 실패");
  const rejectedLeader = await prisma.topicApplication.findFirstOrThrow({ where: { topicId: rejectedTopic.id, participantRole: "LEADER" } });
  const rejection = await decisionRepository.reject(rejectedLeader.id, { id: professorId, isAdmin: false }, appliedAt);
  const rejectedCount = await prisma.topicApplication.count({ where: { topicId: rejectedTopic.id, status: "REJECTED" } });
  if (rejection !== "REJECTED" || rejectedCount !== 2) throw new Error("팀 지원 전체 거절에 실패했습니다.");

  const conflictingTeamTopic = await createTopic(program.id, "TEAM_ONLY", 2);
  const conflictingDraft = await submissionRepository.createTeamDraftIfAvailable({
    topicId: conflictingTeamTopic.id,
    studentId: studentIds[8],
    studentEmail: emails[8],
    kind: "TEAM",
    answers: [{ questionId: conflictingTeamTopic.applicationQuestions[0].id, value: "교차 주제 팀 지원 충돌 검증" }],
    inviteeEmails: [emails[9]],
    appliedAt,
  });
  if (conflictingDraft.outcome !== "INVITATIONS_PENDING") throw new Error("교차 주제 팀 지원 초안 생성 실패");
  const conflictingInvitation = await prisma.teamApplicationInvitation.findFirstOrThrow({ where: { draftId: conflictingDraft.draftId } });
  if (await invitationRepository.respond(conflictingInvitation.id, { id: studentIds[9], email: emails[9] }, "ACCEPT", appliedAt) !== "APPLICATION_CREATED") {
    throw new Error("교차 주제 팀 지원 승격 실패");
  }
  const legacyAcceptedTopic = await createTopic(program.id, "INDIVIDUAL_ONLY", 1);
  const legacyAcceptedApplication = await prisma.topicApplication.create({
    data: { topicId: legacyAcceptedTopic.id, studentId: studentIds[8], message: "교차 주제 기존 지원 수락" },
  });
  if (await decisionRepository.accept(legacyAcceptedApplication.id, { id: professorId, isAdmin: false }, appliedAt) !== "ACCEPTED") {
    throw new Error("교차 주제 기존 지원 수락 실패");
  }
  const rejectedConflictingGroupCount = await prisma.topicApplication.count({ where: { topicId: conflictingTeamTopic.id, status: "REJECTED" } });
  if (rejectedConflictingGroupCount !== 2) throw new Error("기존 지원 수락 시 충돌 팀 지원 전체를 거절하지 못했습니다.");

  const recruitmentTopic = await createTopic(program.id, "INDIVIDUAL_ONLY", 3);
  const recruitmentLeaderApplication = await prisma.topicApplication.create({
    data: { topicId: recruitmentTopic.id, studentId: studentIds[6], message: "기존 팀 대표", status: "ACCEPTED", decidedAt: appliedAt },
  });
  const recruitmentTeam = await prisma.team.create({
    data: { academicCycleId: cycle.id, topicId: recruitmentTopic.id, professorId, name: "기존 모집 호환 팀" },
  });
  await prisma.teamMember.create({
    data: { teamId: recruitmentTeam.id, academicCycleId: cycle.id, topicId: recruitmentTopic.id, studentId: studentIds[6], applicationId: recruitmentLeaderApplication.id, joinedAt: appliedAt },
  });
  const post = await prisma.recruitmentPost.create({
    data: { teamId: recruitmentTeam.id, authorId: studentIds[6], title: "기존 팀원 모집 호환", content: "팀원을 모집합니다.", requiredSkills: ["TypeScript"], roleNeeded: "개발", availability: "평일" },
  });
  const recruitmentRepository = new PrismaRecruitmentRepository(prisma);
  const recruitmentApplication = await recruitmentRepository.apply({ postId: post.id, studentId: studentIds[7], message: "모집 지원", skills: ["TypeScript"], desiredRole: "개발", availability: "평일", appliedAt });
  const storedRecruitmentApplication = await prisma.recruitmentApplication.findFirstOrThrow({ where: { postId: post.id, studentId: studentIds[7] }, include: { topicApplication: { select: { id: true, groupId: true } } } });
  if (recruitmentApplication !== "CREATED" || storedRecruitmentApplication.topicApplication.groupId !== null) {
    throw new Error("기존 팀원 모집 지원이 독립 레거시 지원서로 생성되지 않았습니다.");
  }
  const recruitmentDecision = await decisionRepository.accept(storedRecruitmentApplication.topicApplication.id, { id: studentIds[6], isAdmin: false }, appliedAt);
  if (recruitmentDecision !== "ACCEPTED") throw new Error(`기존 팀원 모집 수락 호환 실패: ${recruitmentDecision}`);

  const closingTopic = await createTopic(program.id, "TEAM_ONLY");
  const closingDraft = await submissionRepository.createTeamDraftIfAvailable({
    topicId: closingTopic.id,
    studentId: studentIds[4],
    studentEmail: emails[4],
    kind: "TEAM",
    answers: [{ questionId: closingTopic.applicationQuestions[0].id, value: "마감 초안 정리 검증" }],
    inviteeEmails: [emails[5]],
    appliedAt,
  });
  if (closingDraft.outcome !== "INVITATIONS_PENDING") throw new Error("마감 정리 검증 팀 초안 생성 실패");
  const topicRepository = new PrismaTopicRepository(prisma);
  if (!(await topicRepository.closePublished(closingTopic.id))) throw new Error("검증 주제 마감 실패");
  if (await prisma.teamApplicationDraft.count({ where: { id: closingDraft.draftId } })) {
    throw new Error("주제 마감 후 미완료 팀 지원 초안이 남았습니다.");
  }

  const closingProgram = await prisma.projectProgram.create({
    data: {
      academicCycleId: cycle.id,
      createdById: professorId,
      name: "초안 정리 검증 프로그램",
      category: "검증",
      description: "프로그램 마감 시 팀 지원 초안 정리 검증",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2027-01-01T00:00:00Z"),
      status: "OPEN",
      openedAt: new Date("2026-01-01T00:00:00Z"),
    },
  });
  const programClosingTopic = await createTopic(closingProgram.id, "TEAM_ONLY");
  const programClosingDraft = await submissionRepository.createTeamDraftIfAvailable({
    topicId: programClosingTopic.id,
    studentId: studentIds[4],
    studentEmail: emails[4],
    kind: "TEAM",
    answers: [{ questionId: programClosingTopic.applicationQuestions[0].id, value: "프로그램 마감 초안 정리 검증" }],
    inviteeEmails: [emails[5]],
    appliedAt,
  });
  if (programClosingDraft.outcome !== "INVITATIONS_PENDING") throw new Error("프로그램 마감 정리 검증 팀 초안 생성 실패");
  const programRepository = new PrismaProjectProgramRepository(prisma);
  if (!(await programRepository.changeStatus(closingProgram.id, "CLOSED", appliedAt))) throw new Error("검증 프로그램 마감 실패");
  if (await prisma.teamApplicationDraft.count({ where: { id: programClosingDraft.draftId } })) {
    throw new Error("프로그램 마감 후 미완료 팀 지원 초안이 남았습니다.");
  }

  const retryTopic = await createTopic(program.id, "TEAM_ONLY");
  const retryDraft = await submissionRepository.createTeamDraftIfAvailable({
    topicId: retryTopic.id,
    studentId: studentIds[4],
    studentEmail: emails[4],
    kind: "TEAM",
    answers: [{ questionId: retryTopic.applicationQuestions[0].id, value: "승격 재시도 검증" }],
    inviteeEmails: [emails[5]],
    appliedAt,
  });
  if (retryDraft.outcome !== "INVITATIONS_PENDING") throw new Error("승격 재시도 팀 초안 생성 실패");
  const retryInvitation = await prisma.teamApplicationInvitation.findFirstOrThrow({ where: { draftId: retryDraft.draftId } });
  await prisma.projectProgram.update({ where: { id: program.id }, data: { status: "CLOSED" } });
  const unavailablePromotion = await invitationRepository.respond(retryInvitation.id, { id: studentIds[5], email: emails[5] }, "ACCEPT", appliedAt);
  const invitationAfterFailure = await prisma.teamApplicationInvitation.findUniqueOrThrow({ where: { id: retryInvitation.id } });
  if (unavailablePromotion !== "TOPIC_UNAVAILABLE" || invitationAfterFailure.status !== "PENDING") {
    throw new Error("승격 실패 후 팀원 초대를 재시도 가능한 상태로 보존하지 못했습니다.");
  }

  console.log(JSON.stringify({ invalidRoleInvite: invalidRoleInvite.outcome, roleChangeBlocked: roleChangePromotion, individual: individual.outcome, teamPromotion: finalAcceptance, acceptedTeamMembers: memberCount, legacyConflict: legacyConflictAfterDecision.status, rejectedTeamMembers: rejectedCount, conflictingTeamRejection: rejectedConflictingGroupCount, recruitmentCompatibility: recruitmentDecision, staleDraftCleanup: true, programDraftCleanup: true, failedPromotionInvitation: invitationAfterFailure.status }));
}

main()
  .finally(cleanup)
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
