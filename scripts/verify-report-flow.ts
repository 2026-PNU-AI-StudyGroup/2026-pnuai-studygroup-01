import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";
import { UploadNotFoundError, UploadService } from "../src/modules/file/application/manage-upload";
import { PrismaUploadIntentRepository } from "../src/modules/file/infrastructure/prisma-upload-intent-repository";
import { S3ObjectStorage } from "../src/modules/file/infrastructure/s3-object-storage";
import {
  ArtifactRegistrationService,
  ReportDecisionService,
  ReportOperationNotAllowedError,
  ReportQueryService,
  ReportRequirementService,
  ReportSubmissionService,
} from "../src/modules/report/application/manage-reports";
import { PrismaArtifactRepository } from "../src/modules/report/infrastructure/prisma-artifact-repository";
import { PrismaReportDecisionRepository } from "../src/modules/report/infrastructure/prisma-report-decision-repository";
import { PrismaReportQueryRepository } from "../src/modules/report/infrastructure/prisma-report-query-repository";
import { PrismaReportRequirementRepository } from "../src/modules/report/infrastructure/prisma-report-requirement-repository";
import { PrismaReportSubmissionRepository } from "../src/modules/report/infrastructure/prisma-report-submission-repository";
import {
  CloseTeamService,
  ListArchivedProjectsService,
  TeamCloseNotAllowedError,
} from "../src/modules/team/application/archive-projects";
import { PrismaTeamArchiveRepository } from "../src/modules/team/infrastructure/prisma-team-archive-repository";
import { TeamDiscussionService, TeamNotFoundError } from "../src/modules/team/application/manage-team-workspace";
import { PrismaTeamDiscussionRepository } from "../src/modules/team/infrastructure/prisma-team-discussion-repository";
import { prisma } from "../src/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "../src/shared/infrastructure/object-storage/s3";

if (process.env.ALLOW_LOCAL_REPORT_TEST !== "true") {
  throw new Error("ALLOW_LOCAL_REPORT_TEST=true인 격리된 로컬 환경에서만 실행할 수 있습니다.");
}

const professorId = randomUUID();
const otherProfessorId = randomUUID();
const studentId = randomUUID();
const pendingStudentId = randomUUID();
let cycleId: string | null = null;
const storage = new S3ObjectStorage(s3, objectStorageBucket);
const uploads = new UploadService(new PrismaUploadIntentRepository(prisma), storage);

async function cleanup() {
  if (cycleId) {
    await prisma.team.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.topicApplication.deleteMany({ where: { topic: { academicCycleId: cycleId } } });
    await prisma.topic.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.projectProgram.deleteMany({ where: { academicCycleId: cycleId } });
    await prisma.academicCycle.deleteMany({ where: { id: cycleId } });
    await uploads.cleanup(new Date(Date.now() + 27 * 60 * 60_000));
  }
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [professorId, otherProfessorId, studentId, pendingStudentId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [professorId, otherProfessorId, studentId, pendingStudentId] } } });
}

async function upload(teamId: string, purpose: "REPORT" | "ARTIFACT", name: string, content: string) {
  const body = Buffer.from(content);
  const sha256 = createHash("sha256").update(body).digest("hex");
  const intent = await uploads.create({ id: studentId, role: "STUDENT" }, {
    teamId,
    purpose,
    originalName: name,
    contentType: "application/pdf",
    size: body.length,
    sha256,
  });
  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "application/pdf",
      "x-amz-checksum-sha256": Buffer.from(sha256, "hex").toString("base64"),
    },
    body,
  });
  if (!put.ok) throw new Error(`MinIO PUT 실패: ${put.status}`);
  await uploads.complete({ id: studentId, role: "STUDENT" }, intent.uploadId);
  return intent.uploadId;
}

async function main() {
  await prisma.user.createMany({ data: [
    { id: professorId, name: "Report Professor", email: `verification+${professorId}@pusan.ac.kr`, emailVerified: true, role: "PROFESSOR" },
    { id: otherProfessorId, name: "Other Professor", email: `verification+${otherProfessorId}@pusan.ac.kr`, emailVerified: true, role: "PROFESSOR" },
    { id: studentId, name: "Report Student", email: `verification+${studentId}@pusan.ac.kr`, emailVerified: true, role: "STUDENT" },
    { id: pendingStudentId, name: "Pending Student", email: `verification+${pendingStudentId}@pusan.ac.kr`, emailVerified: true, role: "STUDENT" },
  ] });
  const cycle = await prisma.academicCycle.create({ data: {
    academicYear: 7000 + Math.floor(Math.random() * 1000), term: "SECOND",
  } });
  cycleId = cycle.id;
  const program = await prisma.projectProgram.create({ data: {
    academicCycleId: cycle.id, createdById: professorId, name: "보고서 검증 프로그램", category: "검증", description: "보고서 통합 검증",
    startsAt: new Date("2025-01-01"), endsAt: new Date("2027-01-01"), status: "OPEN", openedAt: new Date("2025-01-01"),
  } });
  const topic = await prisma.topic.create({ data: {
    academicCycleId: cycle.id, programId: program.id, authorId: professorId, title: "보고서 흐름 검증", description: "보고서 검증", capacity: 2,
    recruitmentStartsAt: new Date("2026-01-01"), recruitmentEndsAt: new Date("2026-12-31"),
    executionStartsAt: new Date("2026-01-01"), executionEndsAt: new Date("2026-12-31"),
    submissionStartsAt: new Date("2026-01-01"), submissionEndsAt: new Date("2026-12-31"),
    status: "PUBLISHED", publishedAt: new Date("2026-01-01"),
  } });
  const application = await prisma.topicApplication.create({ data: {
    topicId: topic.id, studentId, message: "보고서 검증", status: "ACCEPTED", decidedAt: new Date(),
  } });
  const pendingApplication = await prisma.topicApplication.create({ data: {
    topicId: topic.id, studentId: pendingStudentId, message: "종료 전 대기 지원", status: "PENDING",
  } });
  const team = await prisma.team.create({ data: {
    academicCycleId: cycle.id, topicId: topic.id, professorId, name: "보고서 검증 팀", status: "CONFIRMED",
  } });
  await prisma.teamMember.create({ data: {
    teamId: team.id, academicCycleId: cycle.id, topicId: topic.id, studentId, applicationId: application.id,
  } });

  const reportQuery = new ReportQueryService(
    new PrismaReportQueryRepository(prisma),
  );
  const reportRequirements = new ReportRequirementService(
    new PrismaReportRequirementRepository(prisma),
  );
  const reportSubmissions = new ReportSubmissionService(
    new PrismaReportSubmissionRepository(prisma),
  );
  const reportDecisions = new ReportDecisionService(
    new PrismaReportDecisionRepository(prisma),
  );
  const artifactRegistration = new ArtifactRegistrationService(
    new PrismaArtifactRepository(prisma),
  );
  const student = { id: studentId, role: "STUDENT" as const };
  const professor = { id: professorId, role: "PROFESSOR" as const };
  for (const type of ["START", "MIDTERM", "FINAL"] as const) {
    await reportRequirements.setRequirement(
      professor,
      { teamId: team.id, type, dueAt: new Date("2026-12-31T14:59:00Z") },
      new Date("2026-07-13T00:00:00Z"),
    );
  }
  const reportV1File = await upload(team.id, "REPORT", "start-v1.pdf", "start report version one");
  const v1 = await reportSubmissions.submit(student, {
    teamId: team.id, type: "START", fileId: reportV1File, description: "착수 보고서 1차",
  }, new Date("2026-07-14T00:00:00Z"));
  const v1Row = await prisma.reportVersion.findFirstOrThrow({
    where: { reportId: v1.reportId, version: 1 }, select: { id: true },
  });
  await reportDecisions.decide(professor, {
    reportVersionId: v1Row.id, decision: "APPROVED", comment: "착수 승인",
  });

  const reportV2File = await upload(team.id, "REPORT", "start-v2.pdf", "start report version two");
  const v2 = await reportSubmissions.submit(student, {
    teamId: team.id, type: "START", fileId: reportV2File, description: "승인 후 변경 버전",
  }, new Date("2026-07-15T00:00:00Z"));
  if (v2.version !== 2) throw new Error("보고서 버전 번호가 증가하지 않았습니다.");
  const v2Row = await prisma.reportVersion.findFirstOrThrow({
    where: { reportId: v1.reportId, version: 2 }, select: { id: true },
  });
  let unrelatedProfessorDenied = false;
  try {
    await reportDecisions.decide(
      { id: otherProfessorId, role: "PROFESSOR" },
      { reportVersionId: v2Row.id, decision: "APPROVED", comment: "권한 없음" },
    );
  } catch (error) {
    unrelatedProfessorDenied = error instanceof ReportOperationNotAllowedError;
  }
  if (!unrelatedProfessorDenied) throw new Error("다른 교수가 보고서를 승인했습니다.");
  await reportDecisions.decide(professor, {
    reportVersionId: v2Row.id, decision: "REVISION_REQUESTED", comment: "표 보완 필요",
  });

  const midtermV1File = await upload(team.id, "REPORT", "midterm-v1.pdf", "midterm report version one");
  const midtermV1 = await reportSubmissions.submit(student, {
    teamId: team.id, type: "MIDTERM", fileId: midtermV1File, description: "중간 보고서 1차",
  }, new Date("2026-07-15T01:00:00Z"));
  const midtermV1Row = await prisma.reportVersion.findFirstOrThrow({
    where: { reportId: midtermV1.reportId, version: 1 }, select: { id: true },
  });
  const midtermV2File = await upload(team.id, "REPORT", "midterm-v2.pdf", "midterm report version two");
  const midtermV2 = await reportSubmissions.submit(student, {
    teamId: team.id, type: "MIDTERM", fileId: midtermV2File, description: "중간 보고서 2차",
  }, new Date("2026-07-15T02:00:00Z"));
  const midtermV2Row = await prisma.reportVersion.findFirstOrThrow({
    where: { reportId: midtermV2.reportId, version: 2 }, select: { id: true },
  });
  let staleVersionDecisionDenied = false;
  try {
    await reportDecisions.decide(professor, {
      reportVersionId: midtermV1Row.id, decision: "APPROVED", comment: "과거 버전 승인 시도",
    });
  } catch (error) {
    staleVersionDecisionDenied = error instanceof ReportOperationNotAllowedError;
  }
  if (!staleVersionDecisionDenied) throw new Error("최신 버전이 아닌 보고서가 승인되었습니다.");

  const finalFile = await upload(team.id, "REPORT", "final-v1.pdf", "final report version one");
  const finalV1 = await reportSubmissions.submit(student, {
    teamId: team.id, type: "FINAL", fileId: finalFile, description: "최종 보고서 1차",
  }, new Date("2026-07-15T03:00:00Z"));
  const finalV1Row = await prisma.reportVersion.findFirstOrThrow({
    where: { reportId: finalV1.reportId, version: 1 }, select: { id: true },
  });
  const concurrentDecisions = await Promise.allSettled([
    reportDecisions.decide(professor, {
      reportVersionId: finalV1Row.id, decision: "APPROVED", comment: "동시 승인",
    }),
    reportDecisions.decide(professor, {
      reportVersionId: finalV1Row.id, decision: "APPROVED", comment: "동시 중복 승인",
    }),
  ]);
  const concurrentDecisionConverged =
    concurrentDecisions.filter(({ status }) => status === "fulfilled").length === 1 &&
    concurrentDecisions.filter((result) =>
      result.status === "rejected" && result.reason instanceof ReportOperationNotAllowedError,
    ).length === 1;
  if (!concurrentDecisionConverged) throw new Error("동시 보고서 결정이 단일 결과로 수렴하지 않았습니다.");

  const startV3File = await upload(team.id, "REPORT", "start-v3.pdf", "start report final revision");
  const startV3 = await reportSubmissions.submit(student, {
    teamId: team.id, type: "START", fileId: startV3File, description: "수정 요청 반영본",
  }, new Date("2026-07-15T04:00:00Z"));
  const startV3Row = await prisma.reportVersion.findFirstOrThrow({
    where: { reportId: startV3.reportId, version: 3 }, select: { id: true },
  });
  await reportDecisions.decide(professor, {
    reportVersionId: startV3Row.id, decision: "APPROVED", comment: "수정 반영 확인",
  });
  await reportDecisions.decide(professor, {
    reportVersionId: midtermV2Row.id, decision: "APPROVED", comment: "중간 보고서 승인",
  });

  await artifactRegistration.registerArtifact(student, {
    teamId: team.id, type: "SOURCE_CODE", title: "GitHub 저장소", externalUrl: "https://github.com/pnu/project",
  }, new Date("2026-07-16T00:00:00Z"));
  const artifactFile = await upload(team.id, "ARTIFACT", "poster.pdf", "project poster");
  await artifactRegistration.registerArtifact(student, {
    teamId: team.id, type: "POSTER", title: "결과 포스터", fileId: artifactFile,
  }, new Date("2026-07-16T00:00:00Z"));

  let artifactOwnerMutationDenied = false;
  try {
    await prisma.artifact.update({
      where: { fileId: artifactFile },
      data: { registeredById: professorId },
    });
  } catch {
    artifactOwnerMutationDenied = true;
  }
  if (!artifactOwnerMutationDenied) throw new Error("첨부 결과물의 등록자가 사후 변경되었습니다.");

  let attachedFileOwnerMutationDenied = false;
  try {
    await prisma.storedFile.update({
      where: { id: artifactFile },
      data: { ownerId: professorId },
    });
  } catch {
    attachedFileOwnerMutationDenied = true;
  }
  if (!attachedFileOwnerMutationDenied) throw new Error("ATTACHED 파일의 소유자가 사후 변경되었습니다.");

  let attachedFileStatusMutationDenied = false;
  try {
    await prisma.storedFile.update({
      where: { id: artifactFile },
      data: { status: "READY" },
    });
  } catch {
    attachedFileStatusMutationDenied = true;
  }
  if (!attachedFileStatusMutationDenied) throw new Error("ATTACHED 파일이 READY 상태로 되돌아갔습니다.");

  const workspace = await reportQuery.get(student, team.id);
  const start = workspace.reports.find(({ type }) => type === "START");
  if (
    start?.versions.length !== 3 ||
    start.versions[0]?.decision?.decision !== "APPROVED" ||
    start.versions[1]?.decision?.decision !== "REVISION_REQUESTED" ||
    start.versions[2]?.decision?.decision !== "APPROVED" ||
    workspace.artifacts.length !== 2
  ) {
    throw new Error("보고서 승인 이력 또는 결과물 조회가 저장 결과와 다릅니다.");
  }

  const lateFile = await upload(team.id, "REPORT", "late.pdf", "late report");
  let submissionPeriodDenied = false;
  try {
    await reportSubmissions.submit(student, {
      teamId: team.id, type: "FINAL", fileId: lateFile, description: "기간 외 제출",
    }, new Date("2027-01-01T00:00:00Z"));
  } catch (error) {
    submissionPeriodDenied = error instanceof ReportOperationNotAllowedError;
  }
  if (!submissionPeriodDenied) throw new Error("제출 기간 밖 보고서가 접수되었습니다.");

  const archiveRepository = new PrismaTeamArchiveRepository(prisma);
  const closeTeam = new CloseTeamService(archiveRepository);
  let unrelatedProfessorCloseDenied = false;
  try {
    await closeTeam.close({ id: otherProfessorId, role: "PROFESSOR" }, team.id);
  } catch (error) {
    unrelatedProfessorCloseDenied = error instanceof TeamCloseNotAllowedError;
  }
  if (!unrelatedProfessorCloseDenied) throw new Error("다른 교수가 팀을 종료했습니다.");
  await closeTeam.close(professor, team.id);
  const archivePage = await new ListArchivedProjectsService(archiveRepository).execute();
  const archivedTeam = archivePage.projects.find(({ id }) => id === team.id);
  if (archivedTeam?.artifacts.length !== 2) throw new Error("종료 팀 결과물이 아카이브에 보존되지 않았습니다.");
  if (!archivePage.programs.some(({ id }) => id === archivedTeam.programId)) {
    throw new Error("종료 프로젝트의 프로그램이 아카이브 필터에 나타나지 않습니다.");
  }
  const archiveService = new ListArchivedProjectsService(archiveRepository);
  const searchedArchive = await archiveService.execute(1, 20, { query: team.name });
  if (!searchedArchive.projects.some(({ id }) => id === team.id)) {
    throw new Error("팀 이름으로 종료 프로젝트를 검색할 수 없습니다.");
  }
  const programArchive = await archiveService.execute(1, 20, { programId: archivedTeam.programId });
  if (!programArchive.projects.some(({ id }) => id === team.id)) {
    throw new Error("프로그램별 종료 프로젝트를 조회할 수 없습니다.");
  }
  const categorizedArchive = await archiveService.execute(1, 20, { programCategory: archivedTeam.programCategory });
  if (!categorizedArchive.projects.some(({ id }) => id === team.id)) {
    throw new Error("프로그램 분류로 종료 프로젝트를 조회할 수 없습니다.");
  }
  let closedTeamSubmissionDenied = false;
  try {
    await reportSubmissions.submit(student, {
      teamId: team.id, type: "FINAL", fileId: lateFile, description: "종료 후 제출",
    }, new Date("2026-07-17T00:00:00Z"));
  } catch (error) {
    closedTeamSubmissionDenied = error instanceof ReportOperationNotAllowedError;
  }
  if (!closedTeamSubmissionDenied) throw new Error("종료 팀에 보고서가 추가되었습니다.");
  let closedTeamDiscussionDenied = false;
  try {
    await new TeamDiscussionService(
      new PrismaTeamDiscussionRepository(prisma),
    ).createDiscussionPost(student, { teamId: team.id, content: "종료 후 토론" });
  } catch (error) {
    closedTeamDiscussionDenied = error instanceof TeamNotFoundError;
  }
  if (!closedTeamDiscussionDenied) throw new Error("종료 팀에 토론 글이 추가되었습니다.");
  let closedTeamDecisionDenied = false;
  try {
    await reportDecisions.decide(professor, {
      reportVersionId: midtermV2Row.id, decision: "APPROVED", comment: "종료 후 승인",
    });
  } catch (error) {
    closedTeamDecisionDenied = error instanceof ReportOperationNotAllowedError;
  }
  if (!closedTeamDecisionDenied) throw new Error("종료 팀 보고서에 결정이 추가되었습니다.");
  const closedApplication = await prisma.topicApplication.findUniqueOrThrow({
    where: { id: pendingApplication.id }, select: { status: true },
  });
  if (closedApplication.status !== "REJECTED") throw new Error("종료 팀의 대기 지원서가 정리되지 않았습니다.");
  let closedTeamUploadDenied = false;
  try {
    await uploads.create(student, {
      teamId: team.id,
      purpose: "ARTIFACT",
      originalName: "closed.pdf",
      contentType: "application/pdf",
      size: 6,
      sha256: createHash("sha256").update("closed").digest("hex"),
    });
  } catch (error) {
    closedTeamUploadDenied = error instanceof UploadNotFoundError;
  }
  if (!closedTeamUploadDenied) throw new Error("종료 팀에 업로드 예약이 생성되었습니다.");

  console.log(JSON.stringify({
    immutableVersions: start.versions.length,
    approvedHistoryPreserved: true,
    newVersionRequiresReview: true,
    revisionRequested: true,
    unrelatedProfessorDenied,
    staleVersionDecisionDenied,
    concurrentDecisionConverged,
    artifactOwnerMutationDenied,
    attachedFileOwnerMutationDenied,
    attachedFileStatusMutationDenied,
    submissionPeriodDenied,
    unrelatedProfessorCloseDenied,
    closedTeamSubmissionDenied,
    closedTeamDiscussionDenied,
    closedTeamDecisionDenied,
    closedTeamUploadDenied,
    pendingApplicationRejected: closedApplication.status === "REJECTED",
    archivedArtifacts: archivedTeam.artifacts.length,
    artifacts: workspace.artifacts.length,
  }));
}

main().finally(async () => { await cleanup(); await prisma.$disconnect(); }).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
