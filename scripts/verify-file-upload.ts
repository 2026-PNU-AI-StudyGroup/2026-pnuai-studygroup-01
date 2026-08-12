import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";

import { UploadNotFoundError, UploadService } from "../src/modules/file/application/manage-upload";
import { PrismaUploadIntentRepository } from "../src/modules/file/infrastructure/prisma-upload-intent-repository";
import { S3ObjectStorage } from "../src/modules/file/infrastructure/s3-object-storage";
import { prisma } from "../src/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "../src/shared/infrastructure/object-storage/s3";

if (process.env.ALLOW_LOCAL_FILE_TEST !== "true") {
  throw new Error("ALLOW_LOCAL_FILE_TEST=true인 격리된 로컬 환경에서만 실행할 수 있습니다.");
}

const professorId = randomUUID();
const studentId = randomUUID();
let programId: string | null = null;

async function cleanup() {
  if (programId) {
    await prisma.team.deleteMany({ where: { programId } });
    await prisma.topicApplication.deleteMany({ where: { topic: { programId } } });
    await prisma.topic.deleteMany({ where: { programId } });
    await prisma.projectProgram.deleteMany({ where: { id: programId } });
    const cleanupService = new UploadService(
      new PrismaUploadIntentRepository(prisma),
      new S3ObjectStorage(s3, objectStorageBucket),
    );
    await cleanupService.cleanup();
  }
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [professorId, studentId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [professorId, studentId] } } });
}

async function main() {
  await prisma.user.createMany({ data: [
    { id: professorId, name: "Upload Professor", email: `verification+${professorId}@pusan.ac.kr`, emailVerified: true, role: "PROFESSOR" },
    { id: studentId, name: "Upload Student", email: `verification+${studentId}@pusan.ac.kr`, emailVerified: true, role: "STUDENT" },
  ] });
  const program = await prisma.projectProgram.create({ data: {
    createdById: professorId, name: `업로드 검증 프로그램 ${professorId}`, category: "검증", description: "업로드 통합 검증",
    startsAt: new Date("2025-01-01"), endsAt: new Date("2027-01-01"), projectRegistrationStartsAt: new Date("2025-01-01"), projectRegistrationEndsAt: new Date("2027-01-01"), recruitmentStartsAt: new Date("2025-01-01"), recruitmentEndsAt: new Date("2027-01-01"), executionStartsAt: new Date("2025-01-01"), executionEndsAt: new Date("2027-01-01"), submissionStartsAt: new Date("2025-01-01"), submissionEndsAt: new Date("2027-01-01"), isPublic: true, firstPublishedAt: new Date("2025-01-01"),
  } });
  programId = program.id;
  const topic = await prisma.topic.create({ data: {
    programId: program.id, authorId: professorId, managerId: professorId, title: "업로드 검증", description: "업로드 검증", capacity: 1,
    status: "PUBLISHED", publishedAt: new Date("2026-01-01"),
  } });
  const application = await prisma.topicApplication.create({ data: {
    topicId: topic.id, studentId, message: "업로드 검증", status: "ACCEPTED", decidedAt: new Date(),
  } });
  const team = await prisma.team.create({ data: { programId: program.id, topicId: topic.id, professorId, name: "업로드 검증 팀" } });
  await prisma.teamMember.create({ data: { teamId: team.id, programId: program.id, topicId: topic.id, studentId, applicationId: application.id } });

  const storage = new S3ObjectStorage(s3, objectStorageBucket);
  const service = new UploadService(new PrismaUploadIntentRepository(prisma), storage);
  const body = Buffer.from("PMS upload integrity verification");
  const sha256 = createHash("sha256").update(body).digest("hex");
  const intent = await service.create({ id: studentId, role: "STUDENT" }, {
    teamId: team.id, purpose: "REPORT", originalName: "verification.pdf",
    contentType: "application/pdf", size: body.length, sha256,
  });
  const upload = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "application/pdf",
      "x-amz-checksum-sha256": Buffer.from(sha256, "hex").toString("base64"),
    },
    body,
  });
  if (!upload.ok) throw new Error(`MinIO 업로드 실패: ${upload.status} ${await upload.text()}`);
  await service.complete({ id: studentId, role: "STUDENT" }, intent.uploadId);
  const stored = await prisma.storedFile.findUniqueOrThrow({ where: { id: intent.uploadId } });
  if (stored.status !== "READY" || stored.sha256 !== sha256) throw new Error("파일 완료 상태 또는 해시가 일치하지 않습니다.");
  const reportDefinition = await prisma.programReportDefinition.create({ data: { programId: program.id, title: "업로드 검증 보고서", dueAt: new Date("2026-12-31T23:59:00+09:00"), position: 0 } });
  const report = await prisma.report.create({ data: { teamId: team.id, definitionId: reportDefinition.id, titleSnapshot: reportDefinition.title, dueAt: reportDefinition.dueAt } });
  await prisma.reportVersion.create({ data: {
    reportId: report.id, version: 1, fileId: stored.id, submitterId: studentId, description: "업로드 검증",
  } });
  const attached = await prisma.storedFile.findUniqueOrThrow({ where: { id: stored.id } });
  if (attached.status !== "ATTACHED") throw new Error("보고서 파일이 ATTACHED로 전환되지 않았습니다.");

  const wrongPurposeFile = await prisma.storedFile.create({ data: {
    teamId: team.id, ownerId: studentId, purpose: "ARTIFACT", consumer: "ARTIFACT", status: "READY",
    objectKey: `verification/${randomUUID()}`, originalName: "artifact.pdf",
    uploadObjectKey: `staging/verification/${randomUUID()}`,
    contentType: "application/pdf", size: 1, sha256, expiresAt: new Date(),
    cleanupAfter: new Date(Date.now() + 24 * 60 * 60_000), readyAt: new Date(),
  } });
  let wrongPurposeDenied = false;
  try {
    await prisma.reportVersion.create({ data: {
      reportId: report.id, version: 2, fileId: wrongPurposeFile.id, submitterId: studentId, description: "잘못된 목적",
    } });
  } catch {
    wrongPurposeDenied = true;
  }
  if (!wrongPurposeDenied) throw new Error("ARTIFACT 파일이 보고서에 연결되었습니다.");
  await prisma.reportVersion.delete({
    where: { reportId_version: { reportId: report.id, version: 1 } },
  });
  await service.cleanup(new Date(Date.now() + 27 * 60 * 60_000));
  if (await prisma.storedFile.findUnique({ where: { id: stored.id } })) {
    throw new Error("삭제된 보고서 버전의 파일이 회수되지 않았습니다.");
  }

  const reusableIntent = await service.create({ id: studentId, role: "STUDENT" }, {
    teamId: team.id, purpose: "REPORT", originalName: "reusable.pdf",
    contentType: "application/pdf", size: body.length, sha256,
  });
  try {
    await service.complete({ id: studentId, role: "STUDENT" }, reusableIntent.uploadId);
  } catch (error) {
    if (!(error instanceof UploadNotFoundError)) throw error;
  }
  const reusedUpload = await fetch(reusableIntent.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "application/pdf",
      "x-amz-checksum-sha256": Buffer.from(sha256, "hex").toString("base64"),
    },
    body,
  });
  if (!reusedUpload.ok) throw new Error("Presigned URL 재사용 검증 준비에 실패했습니다.");
  await service.cleanup();
  const reusableReservation = await prisma.storedFile.findUnique({
    where: { id: reusableIntent.uploadId },
  });
  if (reusableReservation?.status !== "PENDING") {
    throw new Error("URL 만료 전 업로드 quota 예약이 제거되었습니다.");
  }

  const corruptedIntent = await service.create({ id: studentId, role: "STUDENT" }, {
    teamId: team.id, purpose: "REPORT", originalName: "corrupted.pdf",
    contentType: "application/pdf", size: body.length, sha256,
  });
  const corruptedUpload = await fetch(corruptedIntent.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "application/pdf",
      "x-amz-checksum-sha256": Buffer.from(sha256, "hex").toString("base64"),
    },
    body: Buffer.alloc(body.length, 0),
  });
  if (corruptedUpload.ok) throw new Error("잘못된 본문의 SHA-256 검증이 우회되었습니다.");

  let professorDenied = false;
  try {
    await service.create({ id: professorId, role: "PROFESSOR" }, {
      teamId: team.id, purpose: "REPORT", originalName: "forged.pdf",
      contentType: "application/pdf", size: body.length, sha256,
    });
  } catch (error) {
    professorDenied = error instanceof UploadNotFoundError;
  }
  if (!professorDenied) throw new Error("교수의 보고서 대리 업로드가 허용되었습니다.");

  const quotaRace = await Promise.allSettled(
    Array.from({ length: 4 }, (_, index) => service.create(
      { id: studentId, role: "STUDENT" },
      {
        teamId: team.id, purpose: "REPORT", originalName: `pending-${index}.pdf`,
        contentType: "application/pdf", size: body.length, sha256,
      },
    )),
  );
  const quotaAccepted = quotaRace.filter(({ status }) => status === "fulfilled").length;
  const quotaRejected = quotaRace.filter(
    (result) => result.status === "rejected" && result.reason instanceof UploadNotFoundError,
  ).length;
  const pendingQuotaDenied = quotaAccepted === 1 && quotaRejected === 3;
  if (!pendingQuotaDenied) {
    throw new Error("동시 미완료 업로드 개수 제한이 우회되었습니다.");
  }

  const raceIntent = quotaRace.find(
    (result) => result.status === "fulfilled",
  );
  if (!raceIntent || raceIntent.status !== "fulfilled") {
    throw new Error("팀 삭제 경합 검증용 업로드를 만들지 못했습니다.");
  }
  const raceUpload = await fetch(raceIntent.value.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "application/pdf",
      "x-amz-checksum-sha256": Buffer.from(sha256, "hex").toString("base64"),
    },
    body,
  });
  if (!raceUpload.ok) throw new Error("팀 삭제 경합용 PUT에 실패했습니다.");
  const [completeRace, deleteRace] = await Promise.allSettled([
    service.complete(
      { id: studentId, role: "STUDENT" },
      raceIntent.value.uploadId,
    ),
    prisma.team.delete({ where: { id: team.id } }),
  ]);
  if (deleteRace.status !== "fulfilled") throw deleteRace.reason;
  if (
    completeRace.status === "rejected" &&
    !(completeRace.reason instanceof UploadNotFoundError)
  ) {
    throw completeRace.reason;
  }
  await service.cleanup(new Date(Date.now() + 27 * 60 * 60_000));
  const deletionJobs = await prisma.objectDeletionJob.count();
  const deletedObject = await storage.inspect(stored.objectKey);
  if (deletionJobs !== 0 || deletedObject.size !== undefined) {
    throw new Error("팀 삭제 후 Object Storage 정리가 완료되지 않았습니다.");
  }
  const racedFinal = await storage.inspect(
    `teams/${team.id}/files/${raceIntent.value.uploadId}`,
  );
  if (racedFinal.size !== undefined) {
    throw new Error("팀 삭제와 완료 경합 후 final 객체가 부활했습니다.");
  }
  const resurrectedStaging = await fetch(reusableIntent.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "application/pdf",
      "x-amz-checksum-sha256": Buffer.from(sha256, "hex").toString("base64"),
    },
    body,
  });
  if (!resurrectedStaging.ok) throw new Error("staging 재사용 격리 검증에 실패했습니다.");
  const resurrectedFinal = await storage.inspect(
    `teams/${team.id}/files/${reusableIntent.uploadId}`,
  );
  if (resurrectedFinal.size !== undefined) {
    throw new Error("재사용된 URL이 영구 보관 key를 생성했습니다.");
  }
  await storage.remove(`staging/${team.id}/${reusableIntent.uploadId}`);
  console.log(JSON.stringify({
    presignedPut: true,
    objectMetadataVerified: true,
    sha256Verified: true,
    corruptedBodyDenied: true,
    professorDenied,
    pendingQuotaDenied,
    wrongPurposeDenied,
    detachedFileReclaimed: true,
    reusableUrlReservationRetained: true,
    reusableUrlConfinedToLifecycleStaging: true,
    deletionOutboxProcessed: true,
    completeDeleteRaceSafe: true,
  }));
}

main().finally(async () => { await cleanup(); await prisma.$disconnect(); }).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
