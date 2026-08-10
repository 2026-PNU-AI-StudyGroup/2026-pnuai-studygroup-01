import "dotenv/config";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

import { Prisma, PrismaClient, ProgramLifecycleStatus, UserRole } from "../src/generated/prisma/client";
import { objectStorageBucket, s3 } from "../src/shared/infrastructure/object-storage/s3";
import { opusArchivedProjects } from "./opus-project-catalog";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
if (process.env.ALLOW_LOCAL_DEMO_SEED !== "true") {
  throw new Error("ALLOW_LOCAL_DEMO_SEED=true으로 명시적으로 허용한 환경에서만 실행할 수 있습니다.");
}
const databaseUrl = new URL(connectionString);
const s3Endpoint = process.env.S3_ENDPOINT;
if (!s3Endpoint) throw new Error("S3_ENDPOINT 환경변수가 필요합니다.");

const localHosts = ["127.0.0.1", "localhost"];
const isLocalSeed = localHosts.includes(databaseUrl.hostname)
  && localHosts.includes(new URL(s3Endpoint).hostname);
const isDevelopmentComposeSeed = process.env.ENABLE_DEVELOPMENT_MOCK_AUTH === "true"
  && databaseUrl.hostname === "postgres"
  && new URL(s3Endpoint).hostname === "minio";
if (!isLocalSeed && !isDevelopmentComposeSeed) {
  throw new Error("데모 데이터는 로컬 환경 또는 목 인증 Compose 배포에서만 생성할 수 있습니다.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function createDemoPdf(lines: string[], fontPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({ size: "A4", margin: 64 });
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.font(fontPath).fillColor("#172033");
    document.fontSize(22).text(lines[0]);
    document.moveDown(1.5);
    document.fontSize(13);
    lines.slice(1).forEach((line) => {
      document.text(line);
      document.moveDown(1.25);
    });
    document.end();
  });
}

const demoProjectDocuments = opusArchivedProjects.map((project, index) => [
  project.teamName,
  project.projectName,
  project.overview,
  index % 2 === 0 ? "POSTER" : "OTHER",
  `${project.projectName} 공개 결과물`,
] as const);
const activeDemoStudentNames = [
  "정하늘", "윤서준", "최민지", "한지우", "오세진", "문가영",
  "임도현", "백소연", "강민재", "서유진", "조현우", "신예린",
] as const;
const archivedProjectMemberNames = opusArchivedProjects.flatMap((project) => project.memberNames);
const demoStudentNames = [...activeDemoStudentNames, ...archivedProjectMemberNames];
const opusAdvisors = [...new Map(
  opusArchivedProjects.map((project) => [
    `${project.professorName}:${project.advisorRole}`,
    { name: project.professorName, role: project.advisorRole },
  ]),
).values()];
const opusAdvisorIndex = new Map(
  opusAdvisors.map((advisor, index) => [`${advisor.name}:${advisor.role}`, index]),
);
const archivedProjectCount = opusArchivedProjects.length;
const externalArtifactCount = opusArchivedProjects.reduce(
  (count, project) => count + 1
    + Number(Boolean(project.githubUrl))
    + Number(Boolean(project.youtubeUrl))
    + Number(Boolean(project.productionUrl)),
  0,
);
const artifactCount = archivedProjectCount + externalArtifactCount;

function opusImagePath(sourceTeamId: number, kind: "thumbnail" | "poster") {
  const publicPath = `/mock/opus/${sourceTeamId}-${kind}.webp`;
  const localPath = fileURLToPath(new URL(`../public${publicPath}`, import.meta.url));
  return existsSync(localPath) ? publicPath : null;
}

// OPUS 공개 화면(https://opus.pusan.ac.kr/)의 사이드바 분류명을 그대로 사용한다.
// 회차별 일정·설명과 공개되지 않은 과거 프로그램은 화면 검증을 위한 데모 데이터다.
const opusProgramCategories = {
  hackathon: "PNU 창의융합 해커톤",
  capstone: "CSE 캡스톤 디자인",
  aiBooster: "PNU AI 부스터",
  kakaoTechCampus: "카카오 테크 캠퍼스",
} as const;

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  professors: [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000003",
  ],
  opusAdvisors: Array.from({ length: opusAdvisors.length }, (_, index) => `11000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  students: Array.from({ length: demoStudentNames.length }, (_, index) => `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  programs: Array.from({ length: 11 }, (_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  retiredPrograms: ["40000000-0000-4000-8000-000000000012"],
  topics: Array.from({ length: 6 + archivedProjectCount }, (_, index) => `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  applications: Array.from({ length: 13 + archivedProjectMemberNames.length }, (_, index) => `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  localViewerApplication: "61000000-0000-4000-8000-000000000001",
  teams: Array.from({ length: 3 + archivedProjectCount }, (_, index) => `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  members: Array.from({ length: 7 + archivedProjectMemberNames.length }, (_, index) => `80000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  recruitments: Array.from({ length: 2 }, (_, index) => `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  recruitmentApplications: Array.from({ length: 2 }, (_, index) => `91000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  studentTeams: Array.from({ length: 3 }, (_, index) => `b0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  studentTeamMembers: Array.from({ length: 7 }, (_, index) => `b1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  studentTeamInvitations: Array.from({ length: 2 }, (_, index) => `b2000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  studentTeamRecruitments: Array.from({ length: 4 }, (_, index) => `b3000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  studentTeamRecruitmentApplications: Array.from({ length: 4 }, (_, index) => `b4000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  tasks: Array.from({ length: 13 }, (_, index) => `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  discussions: Array.from({ length: 4 }, (_, index) => `c0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  artifacts: Array.from({ length: artifactCount }, (_, index) => `d0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  storedFiles: Array.from({ length: archivedProjectCount * 2 }, (_, index) => `e0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reports: Array.from({ length: archivedProjectCount }, (_, index) => `f0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reportVersions: Array.from({ length: archivedProjectCount }, (_, index) => `f1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  approvalDecisions: Array.from({ length: archivedProjectCount }, (_, index) => `f2000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeReports: Array.from({ length: 3 }, (_, index) => `f3000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeReportVersions: Array.from({ length: 4 }, (_, index) => `f4000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeApprovalDecisions: Array.from({ length: 3 }, (_, index) => `f5000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeStoredFiles: Array.from({ length: 5 }, (_, index) => `e1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeArtifacts: Array.from({ length: 3 }, (_, index) => `d1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  announcements: Array.from({ length: 5 }, (_, index) => `a1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
};
const baseProfessorEmails = ids.professors.map((_, index) => `demo.professor${index + 1}@pusan.ac.kr`);
const opusAdvisorEmails = ids.opusAdvisors.map((_, index) => `demo.opus.advisor${index + 1}@pusan.ac.kr`);
const allProfessorIds = [...ids.professors, ...ids.opusAdvisors];
const allProfessorEmails = [...baseProfessorEmails, ...opusAdvisorEmails];
const closedTeamIndexes = Array.from({ length: archivedProjectCount }, (_, index) => index + 2);
const demoReportObjectKeys = closedTeamIndexes.map((teamIndex) => `demo/teams/${ids.teams[teamIndex]}/final-report.pdf`);
const demoArtifactObjectKeys = closedTeamIndexes.map((teamIndex) => `demo/teams/${ids.teams[teamIndex]}/published-result.pdf`);
const activeReportObjectKeys = [
  `demo/teams/${ids.teams[0]}/start-report.pdf`,
  `demo/teams/${ids.teams[0]}/midterm-report-v1.pdf`,
  `demo/teams/${ids.teams[0]}/midterm-report-v2.pdf`,
  `demo/teams/${ids.teams[0]}/final-report.pdf`,
];
const activeArtifactObjectKey = `demo/teams/${ids.teams[0]}/accessibility-route-poster.pdf`;
const demoObjectKeys = [...demoReportObjectKeys, ...demoArtifactObjectKeys, ...activeReportObjectKeys, activeArtifactObjectKey];
const demoUploadObjectKeys = demoObjectKeys.map((objectKey) => `staging/${objectKey}`);

async function seed() {
  const fontPath = fileURLToPath(new URL("../public/fonts/pretendard/Pretendard-Regular.ttf", import.meta.url));
  const demoReportPdfs = await Promise.all(demoProjectDocuments.map(([teamName, topicTitle, summary]) => createDemoPdf([
    `${teamName} 결과 보고서`,
    topicTitle,
    summary,
    "수행 과정과 지도교수 승인 내역을 반영한 최종본",
  ], fontPath)));
  const demoArtifactPdfs = await Promise.all(demoProjectDocuments.map(([teamName, topicTitle, summary, , artifactTitle]) => createDemoPdf([
    `${teamName} 공개 결과물`,
    artifactTitle,
    topicTitle,
    summary,
  ], fontPath)));
  const activeReportPdfs = await Promise.all([
    createDemoPdf([
      "배리어프리 캠퍼스 졸업과제 수행계획서",
      "캠퍼스 이동약자를 위한 실내 길찾기",
      "왜 길찾기가 필요한지, 어느 건물부터 조사할지 팀이 함께 정리했습니다.",
      "첫 면담에서 받은 의견까지 반영한 수행계획서입니다.",
    ], fontPath),
    createDemoPdf([
      "배리어프리 캠퍼스 졸업과제 중간보고서 1차",
      "캠퍼스 이동약자를 위한 실내 길찾기",
      "경사로와 엘리베이터, 자동문을 직접 확인한 결과를 담았습니다.",
      "1차 시연에서 찾은 문제와 팀 내부 테스트 결과를 정리했습니다.",
    ], fontPath),
    createDemoPdf([
      "배리어프리 캠퍼스 졸업과제 중간보고서 2차",
      "캠퍼스 이동약자를 위한 실내 길찾기",
      "교수님 의견을 반영해 엘리베이터 운영 시간과 공사 구간 갱신 방법을 보완했습니다.",
      "두 번째 사용자 테스트에서 확인한 내용도 함께 정리했습니다.",
    ], fontPath),
    createDemoPdf([
      "배리어프리 캠퍼스 졸업과제 최종보고서",
      "캠퍼스 이동약자를 위한 실내 길찾기",
      "직접 모은 공간 데이터부터 길찾기 구현, 사용자 테스트까지 한데 정리했습니다.",
      "최종 시연 전에 교수님 검토를 받기 위해 올린 첫 번째 버전입니다.",
    ], fontPath),
  ]);
  const activeArtifactPdf = await createDemoPdf([
    "배리어프리 캠퍼스 졸업과제 최종발표 포스터",
    "캠퍼스 이동약자를 위한 실내 길찾기",
    "이동약자의 관점에서 접근 가능한 경로와 이용 불가능한 구간을 함께 안내합니다.",
    "정하늘 · 윤서준 · 한지우 · 오세진",
  ], fontPath);
  await Promise.all([
    ...demoReportObjectKeys.map((objectKey, index) => s3.send(new PutObjectCommand({ Bucket: objectStorageBucket, Key: objectKey, Body: demoReportPdfs[index], ContentType: "application/pdf" }))),
    ...demoArtifactObjectKeys.map((objectKey, index) => s3.send(new PutObjectCommand({ Bucket: objectStorageBucket, Key: objectKey, Body: demoArtifactPdfs[index], ContentType: "application/pdf" }))),
    ...activeReportObjectKeys.map((objectKey, index) => s3.send(new PutObjectCommand({ Bucket: objectStorageBucket, Key: objectKey, Body: activeReportPdfs[index], ContentType: "application/pdf" }))),
    s3.send(new PutObjectCommand({ Bucket: objectStorageBucket, Key: activeArtifactObjectKey, Body: activeArtifactPdf, ContentType: "application/pdf" })),
  ]);

  const seedResult = await prisma.$transaction(async (tx) => {
    // 검증 프로세스가 강제 종료돼도 전용 이메일 표식이 있는 임시 계정과 그 프로그램만 회수한다.
    const verificationUsers = await tx.user.findMany({
      where: { email: { startsWith: "verification+" } },
      select: { id: true },
    });
    const verificationUserIds = verificationUsers.map(({ id }) => id);
    const verificationPrograms = await tx.projectProgram.findMany({
      where: { OR: [
        { createdById: { in: verificationUserIds } },
        { topics: { some: { OR: [
          { authorId: { in: verificationUserIds } },
          { applications: { some: { studentId: { in: verificationUserIds } } } },
          { team: { is: { OR: [
            { professorId: { in: verificationUserIds } },
            { members: { some: { studentId: { in: verificationUserIds } } } },
          ] } } },
        ] } } },
      ] },
      select: { id: true },
    });
    const verificationProgramIds = verificationPrograms.map(({ id }) => id);
    if (verificationProgramIds.length > 0) {
      await tx.team.deleteMany({ where: { programId: { in: verificationProgramIds } } });
      await tx.topicApplication.deleteMany({ where: { topic: { programId: { in: verificationProgramIds } } } });
      await tx.topic.deleteMany({ where: { programId: { in: verificationProgramIds } } });
      await tx.projectProgram.deleteMany({ where: { id: { in: verificationProgramIds } } });
    }
    if (verificationUserIds.length > 0) {
      await tx.auditLog.deleteMany({ where: { actorId: { in: verificationUserIds } } });
      await tx.user.deleteMany({ where: { id: { in: verificationUserIds } } });
    }

    await tx.notification.deleteMany({ where: { dedupeKey: { startsWith: "demo:" } } });
    await tx.auditLog.deleteMany({ where: { OR: [
      { actorId: { in: [ids.admin, ...allProfessorIds] } },
      { targetId: { in: [...ids.teams, ...ids.reportVersions, ...ids.activeReportVersions, ...allProfessorEmails] } },
    ] } });
    // 파일 ID는 반복 시드에서 유지되지만 파일명·objectKey는 데모 시나리오에 따라 바뀔 수 있다.
    // 기존 outbox 행을 먼저 비우지 않으면 삭제 트리거가 같은 ID와 새 objectKey를 넣으며 PK 충돌한다.
    const demoStoredFileIds = [...ids.storedFiles, ...ids.activeStoredFiles];
    await tx.objectDeletionJob.deleteMany({
      where: { id: { in: demoStoredFileIds.flatMap((id) => [id, `${id}:upload`]) } },
    });
    await tx.artifact.deleteMany({ where: { id: { in: [...ids.artifacts, ...ids.activeArtifacts] } } });
    await tx.approvalDecision.deleteMany({ where: { id: { in: [...ids.approvalDecisions, ...ids.activeApprovalDecisions] } } });
    await tx.reportVersion.deleteMany({ where: { id: { in: [...ids.reportVersions, ...ids.activeReportVersions] } } });
    await tx.report.deleteMany({ where: { id: { in: [...ids.reports, ...ids.activeReports] } } });
    await tx.storedFile.deleteMany({ where: { id: { in: [...ids.storedFiles, ...ids.activeStoredFiles] } } });
    await tx.recruitmentApplication.deleteMany({ where: { postId: { in: ids.recruitments } } });
    await tx.recruitmentPost.deleteMany({ where: { id: { in: ids.recruitments } } });
    await tx.studentTeam.deleteMany({ where: { id: { in: ids.studentTeams } } });
    await tx.teamMember.deleteMany({ where: { id: { in: ids.members } } });
    await tx.task.deleteMany({ where: { id: { in: ids.tasks } } });
    await tx.discussionPost.deleteMany({ where: { id: { in: ids.discussions } } });
    await tx.team.deleteMany({ where: { id: { in: ids.teams } } });
    await tx.topicApplication.deleteMany({ where: { id: { in: [...ids.applications, ids.localViewerApplication] } } });
    await tx.topic.deleteMany({ where: { id: { in: ids.topics } } });
    await tx.projectProgram.deleteMany({ where: { id: { in: ids.retiredPrograms } } });

    const people: Array<[string, string, string, UserRole]> = [
      [ids.admin, "박지은", "demo.admin@pusan.ac.kr", UserRole.ADMIN],
      [ids.professors[0], "김도윤", "demo.professor1@pusan.ac.kr", UserRole.PROFESSOR],
      [ids.professors[1], "이서현", "demo.professor2@pusan.ac.kr", UserRole.PROFESSOR],
      [ids.professors[2], "박준호", "demo.professor3@pusan.ac.kr", UserRole.PROFESSOR],
      ...opusAdvisors.map<[string, string, string, UserRole]>((advisor, index) => [
        ids.opusAdvisors[index], advisor.name, opusAdvisorEmails[index], UserRole.PROFESSOR,
      ]),
      ...demoStudentNames.map<[string, string, string, UserRole]>((name, index) => [
        ids.students[index], name, `demo.student${index + 1}@pusan.ac.kr`, UserRole.STUDENT,
      ]),
    ];
    for (const [id, name, email, role] of people) {
      await tx.user.upsert({
        where: { id },
        update: { name, email, emailVerified: true, role, isActive: true },
        create: { id, name, email, emailVerified: true, role, isActive: true },
      });
    }
    const demoAnnouncements = [
      {
        authorId: ids.admin,
        title: "2026학년도 2학기 졸업과제 운영 일정 안내",
        content: "졸업과제 주제 확정부터 최종 발표까지의 주요 일정을 안내합니다.\n\n- 팀·주제 확정: 8월 14일\n- 수행계획서 제출: 8월 31일\n- 중간보고서 제출: 10월 16일\n- 최종보고서 제출: 12월 11일\n- 작품 전시 및 최종 발표: 12월 18일",
        createdAt: new Date("2026-08-05T09:00:00+09:00"),
      },
      {
        authorId: ids.professors[0],
        title: "졸업과제 수행계획서 작성 및 지도교수 확인 안내",
        content: "수행계획서에는 문제 정의, 선행 사례 조사, 팀원별 역할, 학기별 수행 계획과 예상 결과물을 포함해 주세요. 팀장이 제출한 뒤 지도교수 승인을 받아야 주제와 팀 구성이 최종 확정됩니다.\n\n보완 요청을 받은 경우 지도 의견을 반영한 새 버전을 제출할 수 있습니다.",
        createdAt: new Date("2026-08-04T14:30:00+09:00"),
      },
      {
        authorId: ids.admin,
        title: "졸업과제 팀 구성 확정 전 확인 사항",
        content: "팀 구성 확정 전 졸업예정 학기, 모든 팀원의 참여 상태와 담당 역할을 확인해 주세요. 같은 학기 졸업과제 프로그램에 중복 참여하거나 미응답 초대가 남아 있으면 팀 확정이 제한될 수 있습니다.\n\n팀 변경이 필요하면 지도교수와 협의한 뒤 학과 담당자에게 요청해 주세요.",
        createdAt: new Date("2026-08-01T11:00:00+09:00"),
      },
      {
        authorId: ids.professors[1],
        title: "졸업과제 결과물 공개 및 보안 점검 안내",
        content: "최종 승인된 졸업과제는 포스터, 발표 영상, 소스 코드와 서비스 링크를 공개할 수 있습니다. 기업 데이터나 연구실 비공개 자료를 사용한 팀은 지도교수와 공개 범위를 먼저 협의하고, 개인정보·비공개 저장소 주소·접근 토큰이 포함되지 않았는지 등록 전에 확인해 주세요.",
        createdAt: new Date("2026-07-30T16:20:00+09:00"),
      },
      {
        authorId: ids.admin,
        title: "졸업과제 주제 제안서 사전 검토 안내",
        content: "주제 제안서에는 해결하려는 문제, 대상 사용자, 핵심 기능, 데이터 확보 방법과 한 학기 안에 검증할 범위를 구체적으로 작성해 주세요. 외부 API나 생성형 AI를 사용하는 경우 비용, 개인정보 처리와 장애 시 대체 방안도 함께 검토합니다.",
        createdAt: new Date("2026-07-28T10:00:00+09:00"),
      },
    ] as const;
    for (const [index, announcement] of demoAnnouncements.entries()) {
      await tx.announcement.upsert({
        where: { id: ids.announcements[index] },
        update: { ...announcement, updatedAt: announcement.createdAt },
        create: {
          id: ids.announcements[index],
          ...announcement,
          updatedAt: announcement.createdAt,
        },
      });
    }
    for (const [index, professorId] of allProfessorIds.entries()) {
      const email = allProfessorEmails[index];
      const grantedAt = new Date(new Date("2026-02-10T10:00:00+09:00").getTime() + index * 86_400_000);
      await tx.professorAllowlist.upsert({
        where: { email },
        update: { createdById: ids.admin, revokedAt: null },
        create: { email, createdById: ids.admin, createdAt: grantedAt },
      });
      await tx.auditLog.create({ data: {
        actorId: ids.admin,
        action: "PROFESSOR_ACCESS_GRANTED",
        targetType: "PUSAN_EMAIL",
        targetId: email,
        metadata: { professorId },
        createdAt: grantedAt,
      } });
    }

    const requestedViewerEmail = process.env.DEMO_VIEWER_EMAIL?.trim().toLowerCase();
    const localStudentCandidates = await tx.user.findMany({
      where: { role: UserRole.STUDENT, id: { notIn: ids.students } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    });
    const localViewer = requestedViewerEmail
      ? localStudentCandidates.find(({ email }) => email.toLowerCase() === requestedViewerEmail)
      : localStudentCandidates.find(({ email, name }) => !email.startsWith("demo.") && !name.startsWith("Upload "));
    if (requestedViewerEmail && !localViewer) {
      throw new Error(`DEMO_VIEWER_EMAIL에 해당하는 로컬 학생 계정을 찾을 수 없습니다: ${requestedViewerEmail}`);
    }
    const studentProfileTemplates = [
      [["접근성", "지도 서비스"], ["Next.js", "Figma"], "프론트엔드 개발과 사용자 검증", "평일 18시 이후, 토요일 오전", "사용자가 실제로 겪는 이동 문제를 관찰하고 화면으로 해결하는 일에 관심이 있습니다."],
      [["공간 데이터", "백엔드"], ["PostgreSQL", "PostGIS"], "공간 데이터 모델링", "월·목 저녁", "교내 지도 데이터의 정확도를 높이고 접근 가능한 경로를 모델링하고 싶습니다."],
      [["제품 설계", "웹 서비스"], ["TypeScript", "React"], "서비스 기획과 풀스택 개발", "수요일 저녁, 주말", "사용자 인터뷰를 바탕으로 반복 가능한 프로젝트 운영 흐름을 설계합니다."],
      [["데이터 분석"], ["Python", "SQL"], "데이터 분석", "화·목 19시 이후", "데이터에서 의미 있는 패턴을 찾고 팀의 의사결정에 연결하는 역할을 선호합니다."],
      [["모바일", "접근성"], ["Flutter", "Dart"], "모바일 앱 개발", "평일 저녁", "다양한 사용 환경에서도 이해하기 쉬운 모바일 경험을 만들고 싶습니다."],
      [["자연어 처리", "번역"], ["Python", "Ollama"], "번역 품질 평가", "월·수 저녁", "로컬 모델의 번역 결과를 사용자 관점에서 평가하고 개선하는 데 관심이 있습니다."],
      [["임베디드", "IoT"], ["C", "Arduino"], "센서 연동", "금요일 오후, 주말", "센서 데이터를 안정적으로 수집하고 웹 서비스와 연결하는 작업을 해 왔습니다."],
      [["시각화", "UX"], ["D3.js", "Figma"], "정보 시각화", "화요일 저녁", "복잡한 정보를 빠르게 이해할 수 있는 인터랙션과 시각 표현을 탐구합니다."],
      [["백엔드", "분산 시스템"], ["Java", "Spring"], "서버 개발", "월·수 19시 이후", "신뢰할 수 있는 API와 관찰 가능한 서버를 설계하고 운영하는 데 관심이 있습니다."],
      [["데이터 엔지니어링", "검색"], ["Python", "Elasticsearch"], "데이터 파이프라인 개발", "목요일 저녁, 주말", "흩어진 데이터를 정리해 실제 검색과 분석에 사용할 수 있는 형태로 만드는 일을 좋아합니다."],
      [["보안", "인프라"], ["Go", "Docker"], "인프라와 보안 점검", "화·금 저녁", "서비스가 안전하게 배포되고 장애 상황에서도 복구 가능한 구조를 만들고 싶습니다."],
      [["서비스 기획", "사용자 조사"], ["Figma", "Notion"], "프로덕트 기획", "평일 18시 이후", "인터뷰와 사용성 테스트를 바탕으로 팀이 풀 문제와 우선순위를 명확히 정리합니다."],
    ] as const;
    const studentProfiles = Array.from(
      { length: ids.students.length },
      (_, index) => studentProfileTemplates[index % studentProfileTemplates.length],
    );
    for (const [index, [interests, skills, desiredRole, availability, bio]] of studentProfiles.entries()) {
      await tx.studentProfile.upsert({
        where: { userId: ids.students[index] },
        update: { interests: [...interests], skills: [...skills], desiredRole, availability, bio },
        create: { userId: ids.students[index], interests: [...interests], skills: [...skills], desiredRole, availability, bio },
      });
    }
    if (localViewer) {
      await tx.studentProfile.upsert({
        where: { userId: localViewer.id },
        update: {},
        create: {
          userId: localViewer.id,
          interests: ["캡스톤 디자인", "프로덕트 개발", "사용자 경험"],
          skills: ["TypeScript", "Next.js", "PostgreSQL"],
          desiredRole: "풀스택 개발과 제품 설계",
          availability: "평일 저녁, 주말 협의 가능",
          bio: "실제 사용자의 문제를 관찰하고 팀과 함께 작동하는 제품으로 완성하는 과정에 관심이 있습니다.",
        },
      });
    }

    async function program(input: {
      id: string; name: string; category: string; description: string;
      startsAt: Date; endsAt: Date; lifecycleStatus: ProgramLifecycleStatus;
    }) {
      const sameName = await tx.projectProgram.findUnique({
        where: { name_startsAt: { name: input.name, startsAt: input.startsAt } },
        select: { id: true },
      });
      if (sameName && sameName.id !== input.id) {
        throw new Error(`사용자 프로그램과 이름이 겹쳐 데모 시드를 중단합니다: ${input.name}`);
      }
      return tx.projectProgram.upsert({
        where: { id: input.id },
        update: { name: input.name, category: input.category, description: input.description, startsAt: input.startsAt, endsAt: input.endsAt, projectRegistrationStartsAt: input.startsAt, projectRegistrationEndsAt: input.endsAt, recruitmentEndsAt: input.endsAt, lifecycleStatus: input.lifecycleStatus, isPublic: true },
        create: { ...input, createdById: ids.professors[0], projectRegistrationStartsAt: input.startsAt, projectRegistrationEndsAt: input.endsAt, recruitmentEndsAt: input.endsAt, isPublic: true },
      });
    }
    const activePrograms = [
      await program({ id: ids.programs[0], name: "2026학년도 CSE 졸업과제(캡스톤디자인)", category: opusProgramCategories.capstone, description: "졸업예정 학생이 지도교수와 문제를 정의하고, 두 학기에 걸쳐 설계·구현·사용자 검증·최종 발표까지 수행하는 컴퓨터공학전공 졸업과제", startsAt: new Date("2026-03-01T00:00:00+09:00"), endsAt: new Date("2026-12-20T23:59:59+09:00"), lifecycleStatus: "ACTIVE" }),
      await program({ id: ids.programs[1], name: "제7회 PNU 창의융합AI해커톤", category: opusProgramCategories.hackathon, description: "서로 다른 전공의 학생이 AI를 활용해 캠퍼스와 지역사회의 문제를 정의하고 작동하는 프로토타입으로 검증하는 해커톤", startsAt: new Date("2026-05-01T00:00:00+09:00"), endsAt: new Date("2026-10-31T23:59:59+09:00"), lifecycleStatus: "ACTIVE" }),
      await program({ id: ids.programs[2], name: "PNU AI부스터 2기", category: opusProgramCategories.aiBooster, description: "AI 기초 학습부터 데이터 준비, 모델 활용, 서비스 구현까지 단계적으로 경험하는 프로젝트형 역량 강화 프로그램", startsAt: new Date("2026-04-01T00:00:00+09:00"), endsAt: new Date("2026-11-30T23:59:59+09:00"), lifecycleStatus: "ACTIVE" }),
    ];
    const pastPrograms = [
      await program({ id: ids.programs[3], name: "CSE 캡스톤디자인 2025", category: opusProgramCategories.capstone, description: "2025학년도 컴퓨터공학전공 캡스톤 프로젝트의 주제 제안, 팀 구성, 중간 점검과 최종 결과물을 관리한 프로그램", startsAt: new Date("2025-03-01T00:00:00+09:00"), endsAt: new Date("2025-12-20T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
      await program({ id: ids.programs[4], name: "제6회 PNU 창의융합SW해커톤", category: opusProgramCategories.hackathon, description: "소프트웨어로 캠퍼스와 지역사회의 문제를 해결하기 위해 아이디어를 구체화하고 프로토타입을 제작한 창의융합 해커톤", startsAt: new Date("2025-05-01T00:00:00+09:00"), endsAt: new Date("2025-10-31T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
      // OPUS 공개 목록에 없는 연도·회차는 과거 프로젝트 탐색을 풍부하게 하기 위한 데모 항목이다.
      await program({ id: ids.programs[5], name: "CSE 캡스톤디자인 2024", category: opusProgramCategories.capstone, description: "2024학년도 캡스톤 프로젝트의 팀별 수행 과정과 최종 결과물을 모은 데모 프로그램", startsAt: new Date("2024-03-01T00:00:00+09:00"), endsAt: new Date("2024-12-20T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
      await program({ id: ids.programs[6], name: "PNU AI부스터 1기", category: opusProgramCategories.aiBooster, description: "데이터와 AI 기술을 실제 문제에 적용하며 모델 평가와 서비스 구현 경험을 쌓은 프로젝트형 교육 프로그램", startsAt: new Date("2024-04-01T00:00:00+09:00"), endsAt: new Date("2024-11-30T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
      await program({ id: ids.programs[7], name: "CSE 캡스톤디자인 2023", category: opusProgramCategories.capstone, description: "2023학년도 캡스톤 프로젝트의 제안서부터 최종 발표 자료까지 연결한 데모 프로그램", startsAt: new Date("2023-03-01T00:00:00+09:00"), endsAt: new Date("2023-12-20T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
      await program({ id: ids.programs[8], name: "카카오 테크 캠퍼스 1기", category: opusProgramCategories.kakaoTechCampus, description: "웹 서비스 기획, 개발, 협업과 배포를 한 흐름으로 경험한 산학 연계형 실무 프로젝트", startsAt: new Date("2023-04-01T00:00:00+09:00"), endsAt: new Date("2023-11-30T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
      await program({ id: ids.programs[9], name: "CSE 캡스톤디자인 2022", category: opusProgramCategories.capstone, description: "2022학년도 캡스톤 프로젝트 결과물을 검색하고 열람할 수 있도록 구성한 데모 프로그램", startsAt: new Date("2022-03-01T00:00:00+09:00"), endsAt: new Date("2022-12-20T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
      await program({ id: ids.programs[10], name: "PNU 오픈소스 SW 경진대회 2022", category: opusProgramCategories.hackathon, description: "오픈소스 기반 제품 개발과 공개 기여 경험을 결과물로 남긴 교내 소프트웨어 경진 프로그램", startsAt: new Date("2022-05-01T00:00:00+09:00"), endsAt: new Date("2022-11-30T23:59:59+09:00"), lifecycleStatus: "CLOSED" }),
    ];

    // 운영 종료 뒤에도 공개 프로젝트를 대상으로 별도 투표를 진행할 수 있다.
    // 시드를 실행한 시점에는 2025 캡스톤과 제6회 해커톤의 투표가 열려 있어, 사이드바와 투표 화면을 바로 검증할 수 있다.
    const votingStartsAt = new Date(Date.now() - 86_400_000);
    const votingEndsAt = new Date(Date.now() + 6 * 86_400_000);
    for (const program of pastPrograms.slice(0, 2)) {
      await tx.programVotingPolicy.upsert({
        where: { programId: program.id },
        update: { startsAt: votingStartsAt, endsAt: votingEndsAt, voteLimit: 3, selfVotingAllowed: false, identityVisibility: "ANONYMOUS" },
        create: { programId: program.id, startsAt: votingStartsAt, endsAt: votingEndsAt, voteLimit: 3, selfVotingAllowed: false, identityVisibility: "ANONYMOUS" },
      });
    }

    // OPUS의 2026 캡스톤, 제7회 AI해커톤, AI부스터 2기 공개 API에는 아직 프로젝트가 없다.
    // 아래 진행 주제는 실제 졸업과제 운영 흐름을 중심으로 구성한 생성 데이터다.
    // 해커톤·AI 교육 주제는 공개 아카이브의 프로그램 다양성을 유지할 정도로만 포함한다.
    const activeTopics = [
      ["캠퍼스 이동약자를 위한 실내 길찾기", "강의동 내부의 경사로, 엘리베이터, 자동문과 공사 구간을 반영해 휠체어 사용자가 실제로 이동 가능한 경로를 안내하고 사용자 평가로 정확도를 검증합니다.", ["Next.js", "PostgreSQL", "PostGIS"], ["접근성", "지도 UI"], "프론트엔드 또는 공간 데이터 담당", "주 1회 지도교수 대면 회의와 주 6시간 이상 개발", 4, 0, 0],
      ["졸업과제 전시 관람객 혼잡도 예측 및 동선 안내", "작품 전시장의 익명 출입 인원과 부스별 체류 시간을 분석해 혼잡 구간을 예측하고 운영진과 관람객에게 추천 동선을 제공합니다.", ["TypeScript", "Python"], ["시계열 분석", "데이터 시각화"], "데이터 분석 또는 웹 개발 담당", "기업 멘토 월 2회 기술 검토와 화요일 팀 회의 참여", 4, 0, 1],
      ["졸업과제 수행 기록 및 결과물 아카이브", "주제 제안, 팀 구성, 지도 기록, 보고서 승인과 공개 결과물을 한 흐름으로 연결해 졸업과제 운영 누락을 줄이고 후배가 이전 결과물을 검색할 수 있게 합니다.", ["Next.js", "Prisma", "PostgreSQL"], ["UX 리서치", "테스트 자동화"], "제품 설계 또는 풀스택 개발 담당", "주 1회 지도교수 면담과 주 2회 온라인 진행 공유", 5, 0, 2],
      ["실내 재난 상황 인지 및 대피 경로 안내", "재난문자와 교내 건물·출입구 데이터를 결합해 상황별 행동 요령과 접근 가능한 대피 경로를 안내하고 모의 대피 시나리오로 응답 정확도를 검증합니다.", ["React", "공공데이터 API"], ["RAG", "지도 UI"], "AI 서비스 또는 데이터 연동 담당", "주 1회 지도교수 면담과 학기 중 모의 대피 검증 참여", 4, 0, 0],
      ["캠퍼스 행사 수요 예측 AI", "이전 행사 신청, 학사 일정과 날씨 데이터를 이용해 예상 참여 인원과 준비 물품 수량을 제안하는 대시보드를 만듭니다.", ["Python", "SQL"], ["예측 모델", "데이터 시각화"], "데이터 분석 또는 서비스 기획 담당", "격주 목요일 회의와 최종 해커톤 참여", 3, 1, 1],
      ["논문 초록 한영 번역 품질 비교 도구", "로컬 LLM의 번역 결과를 용어 일관성, 내용 누락과 문장 가독성 기준으로 비교하고 검수 의견을 축적하는 도구를 만듭니다.", ["TypeScript", "Ollama"], ["NLP", "평가 설계"], "번역 평가 또는 웹 개발 담당", "주 1회 온라인 실습과 월 1회 성과 공유", 4, 2, 2],
    ] as const;
    const activeCapstoneTopicCount = activeTopics.filter(
      (topic) => activePrograms[topic[7]].category === opusProgramCategories.capstone,
    ).length;
    if (activeCapstoneTopicCount <= activeTopics.length / 2) {
      throw new Error("진행 데모 주제는 졸업과제가 과반이어야 합니다.");
    }
    for (const [index, data] of activeTopics.entries()) {
      const [title, description, requiredSkills, preferredSkills, roleExpectations, availabilityRequirement, capacity, programIndex, professorIndex] = data;
      const schedules = [
        {
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"),
          executionStartsAt: new Date("2026-08-01T00:00:00+09:00"), executionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-12-15T23:59:59+09:00"),
        },
        {
          recruitmentStartsAt: new Date("2026-06-15T00:00:00+09:00"),
          executionStartsAt: new Date("2026-07-20T00:00:00+09:00"), executionEndsAt: new Date("2026-10-15T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-10-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-10-31T23:59:59+09:00"),
        },
        {
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"),
          executionStartsAt: new Date("2026-07-15T00:00:00+09:00"), executionEndsAt: new Date("2026-11-10T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
        },
        {
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"),
          executionStartsAt: new Date("2026-08-01T00:00:00+09:00"), executionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-12-15T23:59:59+09:00"),
        },
      ] as const;
      const schedule = index === 0
        ? {
          recruitmentStartsAt: new Date("2026-03-02T00:00:00+09:00"),
          executionStartsAt: new Date("2026-03-23T00:00:00+09:00"),
          executionEndsAt: new Date("2026-08-20T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-04-01T00:00:00+09:00"),
          submissionEndsAt: new Date("2026-08-20T23:59:59+09:00"),
        }
        : schedules[programIndex];
      const publishedAt = index === 0
        ? new Date("2026-02-23T09:00:00+09:00")
        : new Date(`2026-06-${String(index + 10).padStart(2, "0")}T09:00:00+09:00`);
      const applicationMode = index % 3 === 0 ? "INDIVIDUAL_OR_TEAM" : index % 3 === 1 ? "INDIVIDUAL_ONLY" : "TEAM_ONLY";
      const applicationQuestions = [
        { label: "이 주제에 지원한 이유와 기여하고 싶은 내용을 작성해 주세요.", maxLength: 800, required: true, position: 0 },
        { label: "관련 경험이나 수행한 프로젝트가 있다면 작성해 주세요.", maxLength: 1000, required: false, position: 1 },
      ];
      await tx.topic.upsert({
        where: { id: ids.topics[index] },
        update: {
          programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex], managerId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity, applicationMode,
          ...schedule,
          status: "PUBLISHED", publishedAt,
        },
        create: {
          id: ids.topics[index], programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex], managerId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity, applicationMode,
          applicationQuestions: { create: applicationQuestions },
          ...schedule,
          status: "PUBLISHED", publishedAt,
        },
      });
    }

    const pastTopics = opusArchivedProjects.map((project) => {
      const advisorIndex = opusAdvisorIndex.get(`${project.professorName}:${project.advisorRole}`);
      if (advisorIndex === undefined) {
        throw new Error(`OPUS 지도 정보가 사용자 계정과 연결되지 않았습니다: ${project.teamName}`);
      }
      const skills = project.categoryKey === "capstone"
        ? [["TypeScript", "Python"], ["프로젝트 구현"]]
        : project.categoryKey === "hackathon"
          ? [["React", "Spring Boot"], ["프로토타이핑"]]
          : [["Python", "LLM"], ["AI 서비스"]];
      return [
        project.projectName,
        project.overview,
        skills[0],
        skills[1],
        project.programIndex,
        ids.opusAdvisors[advisorIndex],
        project.advisorRole,
        project.memberNames.length,
      ] as const;
    });
    for (const [offset, data] of pastTopics.entries()) {
      const [title, description, requiredSkills, preferredSkills, programIndex, professorId, advisorRole, capacity] = data;
      const topicIndex = offset + 6;
      const targetProgram = pastPrograms[programIndex];
      await tx.topic.upsert({
        where: { id: ids.topics[topicIndex] },
        update: {
          programId: targetProgram.id, authorId: professorId, managerId: professorId, advisorRole, title, description,
          requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations: "팀 역할 분담 완료", availabilityRequirement: "프로젝트 종료",
          capacity, recruitmentStartsAt: targetProgram.startsAt,
          executionStartsAt: new Date(targetProgram.startsAt.getTime() + 30 * 86_400_000), executionEndsAt: new Date(targetProgram.endsAt.getTime() - 30 * 86_400_000),
          submissionStartsAt: new Date(targetProgram.endsAt.getTime() - 60 * 86_400_000), submissionEndsAt: targetProgram.endsAt,
          status: "CLOSED", publishedAt: targetProgram.startsAt,
        },
        create: {
          id: ids.topics[topicIndex], programId: targetProgram.id, authorId: professorId, managerId: professorId, advisorRole, title, description,
          requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations: "팀 역할 분담 완료", availabilityRequirement: "프로젝트 종료",
          capacity, recruitmentStartsAt: targetProgram.startsAt,
          executionStartsAt: new Date(targetProgram.startsAt.getTime() + 30 * 86_400_000), executionEndsAt: new Date(targetProgram.endsAt.getTime() - 30 * 86_400_000),
          submissionStartsAt: new Date(targetProgram.endsAt.getTime() - 60 * 86_400_000), submissionEndsAt: targetProgram.endsAt,
          status: "CLOSED", publishedAt: targetProgram.startsAt,
        },
      });
    }

    let nextArchivedStudentIndex = activeDemoStudentNames.length;
    const pastStudentIndexesByProject: number[][] = [];
    const pastAcceptedApplicationRows = pastTopics.flatMap((_, offset) => {
      const studentIndexes = opusArchivedProjects[offset].memberNames.map(
        () => nextArchivedStudentIndex++,
      );
      pastStudentIndexesByProject.push(studentIndexes);
      return studentIndexes.map((studentIndex) => [offset + 6, studentIndex] as const);
    });
    if (nextArchivedStudentIndex !== ids.students.length) {
      throw new Error("OPUS 프로젝트 참여자와 데모 학생 계정 수가 일치하지 않습니다.");
    }
    const acceptedApplicationRows: Array<readonly [number, number]> = [
      // 학생 데모 계정(정하늘)은 하나의 졸업과제에서 전체 팀 워크스페이스를 확인한다.
      [0, 0], [0, 1], [0, 3], [0, 4], [1, 5], [2, 2],
      // OPUS 공개 상세에 등록된 실제 참여자 이름을 프로젝트별로 그대로 연결한다.
      ...pastAcceptedApplicationRows,
    ];
    const reviewApplicationRows = [
      [1, 7, "PENDING", "시계열 데이터를 정리하고 졸업작품 전시 운영진이 이해하기 쉬운 혼잡도 화면으로 표현하겠습니다."],
      [1, 6, "REJECTED", "센서 연동 경험을 바탕으로 개인정보를 수집하지 않는 관람객 계수 장치를 구현하겠습니다."],
      [3, 7, "PENDING", "교내 건물 데이터를 정제하고 모의 대피 시나리오별 안내 정확도를 검증하겠습니다."],
      [4, 8, "REJECTED", "서버 개발 경험을 살려 행사 수요 데이터의 수집 과정을 안정적으로 만들겠습니다."],
      [5, 9, "PENDING", "번역 결과의 차이를 한눈에 비교할 수 있는 정보 구조와 평가 화면을 설계하겠습니다."],
      [2, 10, "PENDING", "인증과 권한 경계를 점검해 학과 프로젝트 기록을 안전하게 관리하고 싶습니다."],
      [2, 11, "REJECTED", "학생 인터뷰 결과를 바탕으로 처음 쓰는 사람도 이해할 수 있는 흐름을 설계하겠습니다."],
    ] as const;
    function acceptedApplicationTiming(topicIndex: number) {
      const createdAt = topicIndex < 6
        ? new Date("2026-07-05T12:00:00+09:00")
        : new Date(pastPrograms[pastTopics[topicIndex - 6][4]].startsAt.getTime() + 14 * 86_400_000);
      const decidedAt = new Date(createdAt.getTime() + 5 * 86_400_000);
      return { createdAt, decidedAt };
    }
    await tx.topicApplication.createMany({ data: acceptedApplicationRows.map(([topicIndex, studentIndex], index) => {
      const { createdAt, decidedAt } = acceptedApplicationTiming(topicIndex);
      const topicTitle = topicIndex < activeTopics.length ? activeTopics[topicIndex][0] : pastTopics[topicIndex - activeTopics.length][0];
      const profile = studentProfiles[studentIndex];
      return {
      id: ids.applications[index], topicId: ids.topics[topicIndex], studentId: ids.students[studentIndex],
      message: `${topicTitle}의 문제 정의에 공감합니다. ${profile[2]} 역할을 맡아 팀의 결과물 완성까지 책임 있게 참여하겠습니다.`,
      skills: [...profile[1]], desiredRole: profile[2], availability: profile[3],
      status: "ACCEPTED", createdAt, decidedAt,
    }}) });
    await tx.topicApplication.createMany({ data: reviewApplicationRows.map(([topicIndex, studentIndex, status, message], offset) => ({
      id: ids.applications[acceptedApplicationRows.length + offset],
      topicId: ids.topics[topicIndex],
      studentId: ids.students[studentIndex],
      message,
      skills: [...studentProfiles[studentIndex][1]],
      desiredRole: studentProfiles[studentIndex][2],
      availability: studentProfiles[studentIndex][3],
      status,
      createdAt: new Date(`2026-07-${String(8 + offset).padStart(2, "0")}T1${offset}:00:00+09:00`),
      decidedAt: status === "REJECTED" ? new Date(`2026-07-${String(10 + offset).padStart(2, "0")}T14:00:00+09:00`) : null,
    })) });

    let localViewerApplicationId: string | null = null;
    if (localViewer) {
      const currentMembership = await tx.teamMember.findUnique({
        where: { programId_studentId: { programId: activePrograms[0].id, studentId: localViewer.id } },
        select: { id: true },
      });
      if (!currentMembership) {
        const viewerApplication = await tx.topicApplication.upsert({
          where: { topicId_studentId: { topicId: ids.topics[2], studentId: localViewer.id } },
          update: {
            status: "ACCEPTED",
            decidedAt: new Date("2026-07-11T15:00:00+09:00"),
          },
          create: {
            id: ids.localViewerApplication,
            topicId: ids.topics[2],
            studentId: localViewer.id,
            message: "졸업과제 운영에서 반복되는 지도 기록과 보고서 누락을 실제 사용 흐름과 코드로 함께 해결하고 싶습니다.",
            skills: ["TypeScript", "Next.js", "PostgreSQL"],
            desiredRole: "풀스택 개발과 제품 설계",
            availability: "평일 저녁, 주말 협의 가능",
            status: "ACCEPTED",
            createdAt: new Date("2026-07-07T19:30:00+09:00"),
            decidedAt: new Date("2026-07-11T15:00:00+09:00"),
          },
          select: { id: true },
        });
        localViewerApplicationId = viewerApplication.id;
      }
    }

    const pastTeamNames = demoProjectDocuments.map(([teamName]) => teamName);
    const teamRows: Array<readonly [number, string, string, string, "FORMING" | "CONFIRMED" | "CLOSED"]> = [
      [0, activePrograms[0].id, ids.professors[0], "배리어프리 캠퍼스", "CONFIRMED"],
      [2, activePrograms[0].id, ids.professors[2], "캡스톤 아카이브", "FORMING"],
      ...pastTopics.map((topic, offset) => [offset + 6, pastPrograms[topic[4]].id, topic[5], pastTeamNames[offset], "CLOSED"] as const),
      [1, activePrograms[0].id, ids.professors[1], "스마트 전시 동선", "CONFIRMED"],
    ];
    await tx.team.createMany({ data: teamRows.map(([topicIndex, programId, professorId, name, status], index) => ({
      id: ids.teams[index], programId, topicId: ids.topics[topicIndex], professorId, name, status,
      sourceUrl: topicIndex >= 6 ? `https://opus.pusan.ac.kr/contest/${opusArchivedProjects[topicIndex - 6].sourceContestId}/teams/view/${opusArchivedProjects[topicIndex - 6].sourceTeamId}` : null,
      thumbnailPath: topicIndex >= 6 ? opusImagePath(opusArchivedProjects[topicIndex - 6].sourceTeamId, "thumbnail") : null,
      posterPath: topicIndex >= 6 ? opusImagePath(opusArchivedProjects[topicIndex - 6].sourceTeamId, "poster") : null,
      createdAt: topicIndex < 6
        ? new Date("2026-07-10T15:00:00+09:00")
        : acceptedApplicationTiming(topicIndex).decidedAt,
    })) });
    const teamIndexByTopic = new Map(teamRows.map(([topicIndex], teamIndex) => [topicIndex, teamIndex]));
    await tx.teamMember.createMany({ data: acceptedApplicationRows.map(([topicIndex, studentIndex], index) => {
      const teamIndex = teamIndexByTopic.get(topicIndex);
      if (teamIndex === undefined) throw new Error(`팀이 없는 주제에 합격 지원이 연결되었습니다: ${topicIndex}`);
      return {
        id: ids.members[index], teamId: ids.teams[teamIndex], programId: teamRows[teamIndex][1], topicId: ids.topics[topicIndex],
        studentId: ids.students[studentIndex], applicationId: ids.applications[index], joinedAt: acceptedApplicationTiming(topicIndex).decidedAt,
      };
    }) });
    if (localViewer && localViewerApplicationId) {
      await tx.teamMember.create({ data: {
        id: ids.members[acceptedApplicationRows.length],
        teamId: ids.teams[1],
        programId: activePrograms[0].id,
        topicId: ids.topics[2],
        studentId: localViewer.id,
        applicationId: localViewerApplicationId,
        joinedAt: new Date("2026-07-11T15:00:00+09:00"),
      } });
    }

    const activeReportSubmittedAt = [
      new Date("2026-04-07T17:30:00+09:00"),
      new Date("2026-06-10T20:10:00+09:00"),
      new Date("2026-06-13T18:40:00+09:00"),
      new Date("2026-08-05T16:20:00+09:00"),
    ];
    const activeReportFiles = [
      {
        id: ids.activeStoredFiles[0],
        objectKey: activeReportObjectKeys[0],
        originalName: "배리어프리-캠퍼스-졸업과제-수행계획서.pdf",
        body: activeReportPdfs[0],
        readyAt: activeReportSubmittedAt[0],
        purpose: "REPORT" as const,
      },
      {
        id: ids.activeStoredFiles[1],
        objectKey: activeReportObjectKeys[1],
        originalName: "배리어프리-캠퍼스-졸업과제-중간보고서-1차.pdf",
        body: activeReportPdfs[1],
        readyAt: activeReportSubmittedAt[1],
        purpose: "REPORT" as const,
      },
      {
        id: ids.activeStoredFiles[2],
        objectKey: activeReportObjectKeys[2],
        originalName: "배리어프리-캠퍼스-졸업과제-중간보고서-2차.pdf",
        body: activeReportPdfs[2],
        readyAt: activeReportSubmittedAt[2],
        purpose: "REPORT" as const,
      },
      {
        id: ids.activeStoredFiles[3],
        objectKey: activeReportObjectKeys[3],
        originalName: "배리어프리-캠퍼스-졸업과제-최종보고서-1차.pdf",
        body: activeReportPdfs[3],
        readyAt: activeReportSubmittedAt[3],
        purpose: "REPORT" as const,
      },
      {
        id: ids.activeStoredFiles[4],
        objectKey: activeArtifactObjectKey,
        originalName: "배리어프리-캠퍼스-졸업과제-최종발표-포스터.pdf",
        body: activeArtifactPdf,
        readyAt: new Date("2026-08-05T19:00:00+09:00"),
        purpose: "ARTIFACT" as const,
      },
    ];
    await tx.storedFile.createMany({ data: activeReportFiles.map((file) => ({
      id: file.id,
      teamId: ids.teams[0],
      ownerId: ids.students[0],
      purpose: file.purpose,
      consumer: file.purpose,
      status: "READY",
      objectKey: file.objectKey,
      uploadObjectKey: `staging/${file.objectKey}`,
      originalName: file.originalName,
      contentType: "application/pdf",
      size: file.body.byteLength,
      sha256: createHash("sha256").update(file.body).digest("hex"),
      expiresAt: file.readyAt,
      cleanupAfter: new Date("2099-12-31T00:00:00+09:00"),
      readyAt: file.readyAt,
      createdAt: file.readyAt,
    })) });
    await tx.report.createMany({ data: [
      { id: ids.activeReports[0], teamId: ids.teams[0], type: "START", dueAt: new Date("2026-04-10T23:59:59+09:00"), createdAt: new Date("2026-03-25T10:00:00+09:00") },
      { id: ids.activeReports[1], teamId: ids.teams[0], type: "MIDTERM", dueAt: new Date("2026-06-12T23:59:59+09:00"), createdAt: new Date("2026-03-25T10:00:00+09:00") },
      { id: ids.activeReports[2], teamId: ids.teams[0], type: "FINAL", dueAt: new Date("2026-08-14T23:59:59+09:00"), createdAt: new Date("2026-03-25T10:00:00+09:00") },
    ] });
    await tx.reportVersion.createMany({ data: [
      {
        id: ids.activeReportVersions[0],
        reportId: ids.activeReports[0],
        version: 1,
        fileId: ids.activeStoredFiles[0],
        submitterId: ids.students[0],
        description: "왜 이 길찾기가 필요한지부터 조사할 건물, 팀원별 역할과 학기 일정까지 정리했습니다.",
        submittedAt: activeReportSubmittedAt[0],
      },
      {
        id: ids.activeReportVersions[1],
        reportId: ids.activeReports[1],
        version: 1,
        fileId: ids.activeStoredFiles[1],
        submitterId: ids.students[0],
        description: "직접 모은 경로 데이터를 점검하고 1차 시연과 사용자 테스트에서 나온 내용을 반영했습니다.",
        submittedAt: activeReportSubmittedAt[1],
      },
      {
        id: ids.activeReportVersions[2],
        reportId: ids.activeReports[1],
        version: 2,
        fileId: ids.activeStoredFiles[2],
        submitterId: ids.students[0],
        description: "교수님이 말씀하신 엘리베이터 운영 시간과 공사 구간 업데이트 방법을 보완하고, 두 번째 테스트 결과도 추가했습니다.",
        submittedAt: activeReportSubmittedAt[2],
      },
      {
        id: ids.activeReportVersions[3],
        reportId: ids.activeReports[2],
        version: 1,
        fileId: ids.activeStoredFiles[3],
        submitterId: ids.students[0],
        description: "지금까지 만든 공간 데이터와 길찾기 기능, 마지막 사용자 테스트 결과를 모았습니다. 아직 아쉬운 점과 다음에 개선할 부분도 같이 적었습니다.",
        submittedAt: activeReportSubmittedAt[3],
      },
    ] });
    await tx.approvalDecision.createMany({ data: [
      {
        id: ids.activeApprovalDecisions[0],
        reportVersionId: ids.activeReportVersions[0],
        reviewerId: ids.professors[0],
        decision: "APPROVED",
        comment: "조사할 범위와 기준은 잘 잡혔습니다. 이대로 먼저 만들어 보고, 실제로 길을 찾아보면서 빠진 부분을 확인해 봅시다.",
        decidedAt: new Date("2026-04-09T11:00:00+09:00"),
      },
      {
        id: ids.activeApprovalDecisions[1],
        reportVersionId: ids.activeReportVersions[1],
        reviewerId: ids.professors[0],
        decision: "REVISION_REQUESTED",
        comment: "엘리베이터가 닫힌 시간이나 공사 때문에 못 가는 길이 아직 바로 반영되지 않네요. 이 정보가 언제, 어떻게 바뀌는지 보완해서 다시 올려 주세요.",
        decidedAt: new Date("2026-06-11T14:30:00+09:00"),
      },
      {
        id: ids.activeApprovalDecisions[2],
        reportVersionId: ids.activeReportVersions[2],
        reviewerId: ids.professors[0],
        decision: "APPROVED",
        comment: "말했던 운영 시간과 공사 구간 반영 방식이 잘 들어갔네요. 이제 실제 사용자에게 한 번 더 써 보게 하고, 나온 의견까지 최종 결과물에 담아 주세요.",
        decidedAt: new Date("2026-06-15T10:30:00+09:00"),
      },
    ] });
    await tx.artifact.createMany({ data: [
      {
        id: ids.activeArtifacts[0],
        teamId: ids.teams[0],
        registeredById: ids.students[0],
        type: "POSTER",
        title: "최종 발표 포스터",
        fileId: ids.activeStoredFiles[4],
        createdAt: new Date("2026-08-05T19:00:00+09:00"),
      },
      {
        id: ids.activeArtifacts[1],
        teamId: ids.teams[0],
        registeredById: ids.students[0],
        type: "SOURCE_CODE",
        title: "웹 서비스 소스 코드",
        externalUrl: "https://example.com/mock/modu-ui-path/source",
        createdAt: new Date("2026-08-05T19:10:00+09:00"),
      },
      {
        id: ids.activeArtifacts[2],
        teamId: ids.teams[0],
        registeredById: ids.students[0],
        type: "PRESENTATION_VIDEO",
        title: "최종 시연 영상",
        externalUrl: "https://example.com/mock/modu-ui-path/demo",
        createdAt: new Date("2026-08-05T19:20:00+09:00"),
      },
    ] });

    for (const [reportIndex, teamIndex] of closedTeamIndexes.entries()) {
      const topicIndex = teamRows[teamIndex][0];
      const programIndex = pastTopics[topicIndex - 6][4];
      const submitterIndex = pastStudentIndexesByProject[reportIndex][0];
      const submittedAt = new Date(pastPrograms[programIndex].endsAt.getTime() - 14 * 86_400_000);
      const approvedAt = new Date(submittedAt.getTime() + 5 * 86_400_000);
      const objectKey = `demo/teams/${ids.teams[teamIndex]}/final-report.pdf`;
      const reportPdf = demoReportPdfs[reportIndex];
      await tx.storedFile.create({ data: {
        id: ids.storedFiles[reportIndex], teamId: ids.teams[teamIndex], ownerId: ids.students[submitterIndex], purpose: "REPORT", consumer: "REPORT", status: "READY",
        objectKey, uploadObjectKey: `staging/${objectKey}`, originalName: `${teamRows[teamIndex][3]}-결과보고서.pdf`, contentType: "application/pdf", size: reportPdf.byteLength,
        sha256: createHash("sha256").update(reportPdf).digest("hex"), expiresAt: submittedAt, cleanupAfter: new Date("2099-12-31T00:00:00+09:00"), readyAt: submittedAt, createdAt: submittedAt,
      } });
      await tx.report.create({ data: { id: ids.reports[reportIndex], teamId: ids.teams[teamIndex], type: "FINAL", dueAt: pastPrograms[programIndex].endsAt, createdAt: submittedAt } });
      await tx.reportVersion.create({ data: {
        id: ids.reportVersions[reportIndex], reportId: ids.reports[reportIndex], version: 1, fileId: ids.storedFiles[reportIndex],
        submitterId: ids.students[submitterIndex], description: "최종 검토 의견을 반영한 결과 보고서", submittedAt,
      } });
      await tx.approvalDecision.create({ data: {
        id: ids.approvalDecisions[reportIndex], reportVersionId: ids.reportVersions[reportIndex], reviewerId: teamRows[teamIndex][2],
        decision: "APPROVED", comment: "최종 결과와 수행 과정 확인 완료", decidedAt: approvedAt,
      } });
      await tx.auditLog.createMany({ data: [
        {
          actorId: teamRows[teamIndex][2], action: "REPORT_APPROVED", targetType: "REPORT_VERSION",
          targetId: ids.reportVersions[reportIndex], metadata: { teamId: ids.teams[teamIndex], reportType: "FINAL", version: 1 }, createdAt: approvedAt,
        },
        {
          actorId: teamRows[teamIndex][2], action: "TEAM_CLOSED", targetType: "TEAM",
          targetId: ids.teams[teamIndex], metadata: { topicId: ids.topics[topicIndex] }, createdAt: new Date(approvedAt.getTime() + 86_400_000),
        },
      ] });
    }

    const recruitmentAuthorId = localViewerApplicationId && localViewer ? localViewer.id : ids.students[2];
    await tx.recruitmentPost.createMany({ data: [
      {
        id: ids.recruitments[0], teamId: ids.teams[1], authorId: recruitmentAuthorId, title: "졸업과제 아카이브 프론트엔드 팀원 구합니다",
        content: "안녕하세요. 저희는 이전 졸업과제를 연도나 기술 분야로 쉽게 찾아볼 수 있는 아카이브를 만들고 있습니다. 기본 화면 설계는 정리되어 있고, React로 검색·상세 화면을 함께 구현하면서 사용성 테스트까지 해보실 분을 찾습니다. 관심 있으시면 편하게 지원해 주세요.", requiredSkills: ["React", "TypeScript", "접근성"],
        roleNeeded: "프론트엔드 개발과 사용성 검증", availability: "수요일 19시 지도교수 면담, 주 6시간 이상", status: "OPEN",
        createdAt: new Date("2026-07-12T18:00:00+09:00"),
      },
      {
        id: ids.recruitments[1], teamId: ids.teams[1], authorId: recruitmentAuthorId, title: "백엔드와 DB 맡아주실 팀원 한 분 구해요",
        content: "주제 제안부터 보고서 승인, 결과물 공개까지 기록이 이어지는 구조를 만들고 있습니다. PostgreSQL이나 Prisma를 써본 분이면 좋고, 경험이 많지 않아도 같이 설계하면서 배우실 분이면 괜찮습니다. OPUS 공개 자료를 가져오는 작업도 함께 진행할 예정입니다.", requiredSkills: ["TypeScript", "PostgreSQL", "Prisma"],
        roleNeeded: "백엔드 개발과 데이터 이관", availability: "주 1회 대면 회의, 비동기 코드 리뷰", status: "OPEN",
        createdAt: new Date("2026-07-14T20:00:00+09:00"),
      },
    ] });
    await tx.recruitmentApplication.createMany({ data: [
      {
        id: ids.recruitmentApplications[0],
        postId: ids.recruitments[0],
        topicApplicationId: ids.applications[acceptedApplicationRows.length + 5],
        studentId: ids.students[10],
        status: "PENDING",
        createdAt: new Date("2026-07-15T21:00:00+09:00"),
      },
      {
        id: ids.recruitmentApplications[1],
        postId: ids.recruitments[1],
        topicApplicationId: ids.applications[acceptedApplicationRows.length + 6],
        studentId: ids.students[11],
        status: "REJECTED",
        createdAt: new Date("2026-07-15T22:30:00+09:00"),
        decidedAt: new Date("2026-07-16T19:00:00+09:00"),
      },
    ] });

    const studentTeamViewer = localViewer ?? {
      id: ids.students[0],
      name: demoStudentNames[0],
      email: "demo.student1@pusan.ac.kr",
    };
    const studentTeamRows = [
      {
        id: ids.studentTeams[0],
        name: "배리어프리 캠퍼스 준비팀",
        description: "교내 이동약자를 위한 실내 길찾기를 졸업과제로 수행하기 위해 접근성 조사와 지도 프로토타입을 준비합니다.",
        leaderId: ids.students[0],
        createdAt: new Date("2026-07-03T10:00:00+09:00"),
      },
      {
        id: ids.studentTeams[1],
        name: "스마트 대피 안내 준비팀",
        description: "교내 재난 상황을 감지하고 건물별 대피 가능 경로를 안내하는 졸업과제 팀을 준비합니다.",
        leaderId: ids.students[5],
        createdAt: new Date("2026-07-06T14:00:00+09:00"),
      },
      {
        id: ids.studentTeams[2],
        name: "캡스톤 아카이브 준비팀",
        description: "흩어진 졸업과제 지도 기록과 공개 결과물을 검색 가능한 학과 아카이브로 연결합니다.",
        leaderId: studentTeamViewer.id,
        createdAt: new Date("2026-07-09T18:00:00+09:00"),
      },
    ];
    await tx.studentTeam.createMany({ data: studentTeamRows });
    await tx.studentTeamMember.createMany({ data: [
      { id: ids.studentTeamMembers[0], teamId: ids.studentTeams[0], studentId: ids.students[0], role: "LEADER", joinedAt: new Date("2026-07-03T10:00:00+09:00") },
      { id: ids.studentTeamMembers[1], teamId: ids.studentTeams[0], studentId: ids.students[3], role: "MEMBER", joinedAt: new Date("2026-07-04T19:00:00+09:00") },
      { id: ids.studentTeamMembers[2], teamId: ids.studentTeams[1], studentId: ids.students[5], role: "LEADER", joinedAt: new Date("2026-07-06T14:00:00+09:00") },
      { id: ids.studentTeamMembers[3], teamId: ids.studentTeams[1], studentId: ids.students[6], role: "MEMBER", joinedAt: new Date("2026-07-07T20:00:00+09:00") },
      { id: ids.studentTeamMembers[4], teamId: ids.studentTeams[2], studentId: studentTeamViewer.id, role: "LEADER", joinedAt: new Date("2026-07-09T18:00:00+09:00") },
      { id: ids.studentTeamMembers[5], teamId: ids.studentTeams[2], studentId: ids.students[8], role: "MEMBER", joinedAt: new Date("2026-07-10T19:30:00+09:00") },
      { id: ids.studentTeamMembers[6], teamId: ids.studentTeams[2], studentId: ids.students[9], role: "MEMBER", joinedAt: new Date("2026-07-12T16:00:00+09:00") },
    ] });
    // 뷰어 폴백이 students[0]이면 students[0]은 이미 studentTeams[0]의 팀장이라
    // "자기 팀에 자기 자신을 초대"하는 행이 된다. 뷰어가 별도 계정일 때만 추가한다.
    const studentTeamInvitationRows: Prisma.StudentTeamInvitationCreateManyInput[] = [
      {
        id: ids.studentTeamInvitations[1],
        teamId: ids.studentTeams[1],
        email: "demo.student8@pusan.ac.kr",
        inviteeId: ids.students[7],
        invitedById: ids.students[5],
        status: "PENDING",
        createdAt: new Date("2026-07-19T11:00:00+09:00"),
      },
    ];
    if (studentTeamViewer.id !== ids.students[0]) {
      studentTeamInvitationRows.unshift({
        id: ids.studentTeamInvitations[0],
        teamId: ids.studentTeams[0],
        email: studentTeamViewer.email,
        inviteeId: studentTeamViewer.id,
        invitedById: ids.students[0],
        status: "PENDING",
        createdAt: new Date("2026-07-18T19:00:00+09:00"),
      });
    }
    await tx.studentTeamInvitation.createMany({ data: studentTeamInvitationRows });
    await tx.studentTeamRecruitmentPost.createMany({ data: [
      {
        id: ids.studentTeamRecruitments[0],
        teamId: ids.studentTeams[0],
        authorId: ids.students[0],
        title: "실내 길찾기 지도 화면 같이 만들 팀원 구해요",
        content: "저희는 휠체어 사용자가 교내에서 실제로 이동할 수 있는 경로를 안내하는 졸업과제를 준비하고 있습니다. 현장 조사는 시작했고, 층간 이동과 접근 불가 구간을 보기 쉽게 보여주는 웹 화면을 같이 구현할 분을 찾습니다. React나 TypeScript 경험이 있으면 좋지만 접근성 주제에 관심 있는 분도 환영합니다.",
        requiredSkills: ["React", "TypeScript", "접근성"],
        roleNeeded: "프론트엔드 개발",
        availability: "화·목 19시 이후, 주말 협의",
        capacity: 5,
        status: "OPEN",
        createdAt: new Date("2026-07-20T10:00:00+09:00"),
        deadlineAt: new Date("2026-08-20T10:00:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitments[1],
        teamId: ids.studentTeams[1],
        authorId: ids.students[5],
        title: "대피 경로 API 같이 개발하실 분 찾습니다",
        content: "교내 건물별 대피 경로를 안내하는 졸업과제를 준비 중입니다. 건물 도면과 출입구 정보를 정리해서 경로 탐색 API로 만드는 역할을 함께 맡아주실 분을 구합니다. 그래프 알고리즘이나 PostgreSQL을 다뤄봤다면 좋고, 공간 데이터에 관심 있어서 공부해 보고 싶은 분도 괜찮습니다.",
        requiredSkills: ["Python", "PostgreSQL", "그래프 알고리즘"],
        roleNeeded: "공간 데이터 모델링과 백엔드 개발",
        availability: "월·수 저녁 온라인, 격주 토요일",
        capacity: 4,
        status: "OPEN",
        createdAt: new Date("2026-07-21T13:00:00+09:00"),
        deadlineAt: new Date("2026-08-21T13:00:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitments[2],
        teamId: ids.studentTeams[2],
        authorId: studentTeamViewer.id,
        title: "졸업과제 아카이브 기획·UX 팀원 구합니다",
        content: "학과에 흩어져 있는 졸업과제 결과물을 한곳에서 찾아볼 수 있는 서비스를 만들려고 합니다. 졸업생과 재학생 인터뷰를 같이 진행하고, 어떤 기준으로 검색하면 좋을지 화면 구조를 잡아주실 분을 찾습니다. Figma를 써봤거나 사용자 인터뷰에 관심 있는 분이면 편하게 지원해 주세요.",
        requiredSkills: ["Figma", "사용자 조사", "정보 구조"],
        roleNeeded: "UX 리서치와 서비스 기획",
        availability: "수요일 19시 정기 회의, 비동기 협업",
        capacity: 5,
        status: "OPEN",
        createdAt: new Date("2026-07-22T16:00:00+09:00"),
        deadlineAt: new Date("2026-08-22T16:00:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitments[3],
        teamId: ids.studentTeams[0],
        authorId: ids.students[0],
        title: "교내 접근성 현장 조사 함께하실 분 구해요",
        content: "주요 강의동의 경사로, 엘리베이터와 자동문을 직접 확인하고 이동약자 인터뷰 내용을 정리하는 역할입니다. 개발보다 현장 조사와 문서 정리에 관심 있는 분도 참여할 수 있도록 열어두었고, 필요한 인원이 모여 현재 모집은 마감했습니다.",
        requiredSkills: ["현장 조사", "인터뷰", "문서화"],
        roleNeeded: "접근성 데이터 조사",
        availability: "온라인 비동기 협업",
        capacity: 3,
        status: "CLOSED",
        createdAt: new Date("2026-07-08T12:00:00+09:00"),
        deadlineAt: new Date("2026-08-08T12:00:00+09:00"),
      },
    ] });
    // DEMO_VIEWER_EMAIL 미지정 시 studentTeamViewer가 students[0]로 폴백하는데,
    // students[0]는 아래 엔트리에서 이미 recruitments[1]에 지원한다. 그대로 두면
    // (postId, studentId) 유니크 제약 위반 → 뷰어가 별도 계정일 때만 뷰어 지원 행을 추가한다.
    const studentTeamRecruitmentApplicationRows: Prisma.StudentTeamRecruitmentApplicationCreateManyInput[] = [
      {
        id: ids.studentTeamRecruitmentApplications[1],
        postId: ids.studentTeamRecruitments[2],
        studentId: ids.students[10],
        message: "졸업과제 아카이브 주제에 관심이 있어 지원합니다. 공개 결과물과 지도 기록의 권한을 나누는 부분을 같이 고민하고, 배포할 때 생길 수 있는 보안 문제도 점검해 보고 싶습니다.",
        skills: ["Go", "Docker", "보안"],
        desiredRole: "인프라와 보안 점검",
        availability: "화·금 저녁",
        status: "PENDING",
        createdAt: new Date("2026-07-24T18:30:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitmentApplications[2],
        postId: ids.studentTeamRecruitments[3],
        studentId: ids.students[11],
        message: "사용자 인터뷰와 문서 정리 경험이 있어 지원했습니다. 이동약자 인터뷰 내용을 보기 쉽게 정리하고 다음 현장 조사 항목을 만드는 데 기여하고 싶습니다.",
        skills: ["Figma", "Notion", "사용자 조사"],
        desiredRole: "프로덕트 기획",
        availability: "평일 18시 이후",
        status: "REJECTED",
        decidedAt: new Date("2026-07-15T14:00:00+09:00"),
        createdAt: new Date("2026-07-10T19:00:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitmentApplications[3],
        postId: ids.studentTeamRecruitments[1],
        studentId: ids.students[12],
        message: "PostgreSQL과 공간 데이터에 관심이 있어 지원합니다. 건물 연결 관계와 통행 제한을 데이터로 정리하고 경로 탐색 결과를 같이 검증해 보고 싶습니다.",
        skills: ["PostgreSQL", "PostGIS", "TypeScript"],
        desiredRole: "공간 데이터 모델링과 API 연동",
        availability: "평일 18시 이후, 토요일 오전",
        status: "PENDING",
        createdAt: new Date("2026-07-24T20:00:00+09:00"),
      },
    ];
    if (studentTeamViewer.id !== ids.students[0]) {
      studentTeamRecruitmentApplicationRows.unshift({
        id: ids.studentTeamRecruitmentApplications[0],
        postId: ids.studentTeamRecruitments[1],
        studentId: studentTeamViewer.id,
        message: "백엔드 데이터를 화면과 연결하는 작업을 해본 적이 있습니다. 대피 경로 API를 안전 안내 화면에 붙이고 모의 대피 시나리오까지 함께 테스트해 보고 싶습니다.",
        skills: ["TypeScript", "PostgreSQL", "지도 UI"],
        desiredRole: "경로 탐색 API와 프론트엔드 연동",
        availability: "평일 저녁, 주말 협의 가능",
        status: "PENDING",
        createdAt: new Date("2026-07-23T20:00:00+09:00"),
      });
    }
    await tx.studentTeamRecruitmentApplication.createMany({
      data: studentTeamRecruitmentApplicationRows,
    });

    await tx.task.createMany({ data: [
      { id: ids.tasks[0], teamId: ids.teams[0], createdById: ids.students[0], title: "경사로·엘리베이터 직접 확인하기", dueAt: new Date("2026-04-30T18:00:00+09:00"), status: "DONE" },
      { id: ids.tasks[1], teamId: ids.teams[0], createdById: ids.students[0], title: "휠체어 사용자와 길찾기 테스트하기", dueAt: new Date("2026-07-25T18:00:00+09:00"), status: "DONE" },
      { id: ids.tasks[2], teamId: ids.teams[0], createdById: ids.students[1], title: "교수님 피드백 보고서·포스터에 반영하기", dueAt: new Date("2026-08-12T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.tasks[3], teamId: ids.teams[1], createdById: ids.students[2], title: "졸업생·지도교수 요구사항 인터뷰 5건", dueAt: new Date("2026-07-22T18:00:00+09:00"), status: "DONE" },
      { id: ids.tasks[4], teamId: ids.teams[1], createdById: ids.students[2], title: "졸업과제 아카이브 정보 구조 검증", dueAt: new Date("2026-08-12T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.tasks[5], teamId: ids.teams[1], createdById: ids.students[2], title: "OPUS 공개 결과물 이관 프로토타입", dueAt: new Date("2026-08-26T18:00:00+09:00"), status: "TODO" },
      { id: ids.tasks[6], teamId: ids.teams[1], createdById: ids.students[2], title: "보고서 승인·결과물 공개 시나리오 테스트", dueAt: new Date("2026-09-09T18:00:00+09:00"), status: "TODO" },
      { id: ids.tasks[7], teamId: ids.teams[ids.teams.length - 1], createdById: ids.students[5], title: "전시장 익명 관람객 계수 데이터 점검", dueAt: new Date("2026-08-01T18:00:00+09:00"), status: "DONE" },
      { id: ids.tasks[8], teamId: ids.teams[ids.teams.length - 1], createdById: ids.students[5], title: "부스별 혼잡도 예측 대시보드 프로토타입", dueAt: new Date("2026-08-28T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.tasks[9], teamId: ids.teams[ids.teams.length - 1], createdById: ids.students[5], title: "졸업작품 전시 모의 운영 검증", dueAt: new Date("2026-09-24T18:00:00+09:00"), status: "TODO" },
      { id: ids.tasks[10], teamId: ids.teams[0], createdById: ids.students[1], title: "건물·출입구 데이터 PostGIS에 정리하기", dueAt: new Date("2026-05-20T18:00:00+09:00"), status: "DONE" },
      { id: ids.tasks[11], teamId: ids.teams[0], createdById: ids.students[3], title: "층간 이동 경로 먼저 연결해 보기", dueAt: new Date("2026-06-30T18:00:00+09:00"), status: "DONE" },
      { id: ids.tasks[12], teamId: ids.teams[0], createdById: ids.students[4], title: "최종 발표 시연하고 인수인계 정리하기", dueAt: new Date("2026-08-18T18:00:00+09:00"), status: "TODO" },
    ] });
    await tx.taskAssignee.createMany({ data: [
      { taskId: ids.tasks[0], userId: ids.students[0] },
      { taskId: ids.tasks[1], userId: ids.students[0] },
      { taskId: ids.tasks[1], userId: ids.students[1] },
      { taskId: ids.tasks[2], userId: ids.students[0] },
      { taskId: ids.tasks[2], userId: ids.students[1] },
      { taskId: ids.tasks[3], userId: ids.students[2] },
      { taskId: ids.tasks[4], userId: ids.students[2] },
      { taskId: ids.tasks[4], userId: ids.students[3] },
      { taskId: ids.tasks[5], userId: ids.students[3] },
      { taskId: ids.tasks[6], userId: ids.students[2] },
      { taskId: ids.tasks[6], userId: ids.students[3] },
      { taskId: ids.tasks[7], userId: ids.students[5] },
      { taskId: ids.tasks[8], userId: ids.students[5] },
      { taskId: ids.tasks[9], userId: ids.students[5] },
      { taskId: ids.tasks[10], userId: ids.students[1] },
      { taskId: ids.tasks[11], userId: ids.students[3] },
      { taskId: ids.tasks[11], userId: ids.students[4] },
      { taskId: ids.tasks[12], userId: ids.students[0] },
      { taskId: ids.tasks[12], userId: ids.students[4] },
    ] });
    await tx.discussionPost.createMany({ data: [
      { id: ids.discussions[0], teamId: ids.teams[0], authorId: ids.professors[0], content: "조금 돌아가더라도 실제로 갈 수 있는 길을 알려주는 게 더 중요합니다. 계단이나 닫힌 출입구가 나오면 왜 못 가는지도 화면에서 바로 알 수 있게 해 주세요.", createdAt: new Date("2026-07-17T10:00:00+09:00") },
      { id: ids.discussions[1], teamId: ids.teams[1], authorId: ids.professors[2], content: "기능 목록보다 졸업생이 결과물을 등록하고 후배가 비슷한 주제를 찾는 핵심 흐름을 먼저 검증해 주세요.", createdAt: new Date("2026-07-14T10:00:00+09:00") },
      { id: ids.discussions[2], teamId: ids.teams[1], authorId: ids.students[2], content: "이번 주에는 연도, 기술 분야와 지도교수 기준으로 OPUS 프로젝트 20건을 분류해 검색 결과를 검증하겠습니다.", createdAt: new Date("2026-07-15T13:30:00+09:00") },
      { id: ids.discussions[3], teamId: ids.teams[1], authorId: ids.professors[2], content: "보고서 원문은 팀과 지도교수만 보고, 승인된 포스터와 발표 영상만 공개되도록 권한 시나리오를 포함해 주세요.", createdAt: new Date("2026-07-16T11:00:00+09:00") },
    ] });
    if (localViewer && localViewerApplicationId) {
      await tx.notification.createMany({ data: [
        {
          recipientId: localViewer.id,
          type: "APPLICATION_RESULT",
          title: "졸업과제 참여가 확정되었습니다",
          body: "졸업과제 수행 기록 및 결과물 아카이브 팀에 합류했습니다. 팀 공간에서 지도교수 면담과 수행계획서 일정을 확인해 주세요.",
          href: `/teams/${ids.teams[1]}`,
          dedupeKey: `demo:viewer:application-accepted:${localViewer.id}`,
          readAt: new Date("2026-07-11T16:00:00+09:00"),
          createdAt: new Date("2026-07-11T15:00:00+09:00"),
        },
        {
          recipientId: localViewer.id,
          type: "SYSTEM",
          title: "새로운 팀원 지원이 도착했습니다",
          body: "프론트엔드 팀원 모집 글에 조현우 학생이 지원했습니다. 지원 조건과 메시지를 확인해 주세요.",
          href: "/recruitments",
          dedupeKey: `demo:viewer:recruitment-application:${localViewer.id}`,
          createdAt: new Date("2026-07-15T21:00:00+09:00"),
        },
        {
          recipientId: localViewer.id,
          type: "DEADLINE",
          title: "캡스톤 아카이브 할 일 마감 임박",
          body: "졸업생·지도교수 인터뷰 정리 마감이 가까워졌습니다. 남은 할 일과 제출 상태를 확인해 주세요.",
          href: `/teams/${ids.teams[1]}`,
          dedupeKey: `demo:viewer:task-deadline:${localViewer.id}`,
          createdAt: new Date("2026-07-16T09:00:00+09:00"),
        },
        {
          recipientId: localViewer.id,
          type: "SYSTEM",
          title: "지도교수의 새 피드백이 있습니다",
          body: "보고서 원문과 공개 결과물의 권한을 분리한 시나리오를 사용자 테스트에 포함해 달라는 의견이 등록되었습니다.",
          href: `/teams/${ids.teams[1]}`,
          dedupeKey: `demo:viewer:professor-feedback:${localViewer.id}`,
          createdAt: new Date("2026-07-16T11:00:00+09:00"),
        },
      ] });
    }

    let nextArtifactIndex = archivedProjectCount;
    for (const [index, teamIndex] of closedTeamIndexes.entries()) {
      const ownerId = ids.students[pastStudentIndexesByProject[index][0]];
      const publishedAt = new Date(pastPrograms[pastTopics[teamRows[teamIndex][0] - 6][4]].endsAt.getTime() - 8 * 86_400_000);
      const objectKey = demoArtifactObjectKeys[index];
      const fileId = ids.storedFiles[index + closedTeamIndexes.length];
      const artifactPdf = demoArtifactPdfs[index];
      const artifactSeed = demoProjectDocuments[index];
      await tx.storedFile.create({ data: {
        id: fileId, teamId: ids.teams[teamIndex], ownerId, purpose: "ARTIFACT", consumer: "ARTIFACT", status: "READY",
        objectKey, uploadObjectKey: `staging/${objectKey}`, originalName: `${teamRows[teamIndex][3]}-공개결과.pdf`, contentType: "application/pdf",
        size: artifactPdf.byteLength, sha256: createHash("sha256").update(artifactPdf).digest("hex"), expiresAt: publishedAt, cleanupAfter: new Date("2099-12-31T00:00:00+09:00"),
        readyAt: publishedAt, createdAt: publishedAt,
      } });
      await tx.artifact.create({ data: {
        id: ids.artifacts[index], teamId: ids.teams[teamIndex], registeredById: ownerId, type: artifactSeed[3],
        title: artifactSeed[4], fileId, createdAt: publishedAt,
      } });
      const project = opusArchivedProjects[index];
      const externalArtifacts = [
        { type: "OTHER" as const, title: "OPUS 원본 페이지", externalUrl: `https://opus.pusan.ac.kr/contest/${project.sourceContestId}/teams/view/${project.sourceTeamId}` },
        ...(project.githubUrl ? [{ type: "SOURCE_CODE" as const, title: "GitHub 저장소", externalUrl: project.githubUrl }] : []),
        ...(project.youtubeUrl ? [{ type: "PRESENTATION_VIDEO" as const, title: "발표 영상", externalUrl: project.youtubeUrl }] : []),
        ...(project.productionUrl ? [{ type: "OTHER" as const, title: "프로젝트 서비스", externalUrl: project.productionUrl }] : []),
      ];
      await tx.artifact.createMany({ data: externalArtifacts.map((artifact, artifactOffset) => ({
        id: ids.artifacts[nextArtifactIndex + artifactOffset],
        teamId: ids.teams[teamIndex],
        registeredById: ownerId,
        ...artifact,
        createdAt: new Date(publishedAt.getTime() + (artifactOffset + 1) * 1_000),
      })) });
      nextArtifactIndex += externalArtifacts.length;
    }
    if (nextArtifactIndex !== ids.artifacts.length) {
      throw new Error("OPUS 외부 결과물 링크와 데모 결과물 ID 수가 일치하지 않습니다.");
    }
    await tx.objectDeletionJob.deleteMany({
      where: { objectKey: { in: [...demoObjectKeys, ...demoUploadObjectKeys] } },
    });
    const [integrity] = await tx.$queryRaw<Array<{
      scheduleOutsideProgram: number;
      duplicateMembership: number;
      recruitmentStudentMismatch: number;
      professorWithoutAllowlist: number;
      closedTeamWithoutApproval: number;
      closedTeamWithoutAudit: number;
    }>>(Prisma.sql`
      SELECT
        (SELECT count(*)::int FROM "topic" AS topic
          JOIN "project_program" AS program ON program."id" = topic."programId"
          WHERE topic."recruitmentStartsAt" < program."startsAt"
            OR topic."executionStartsAt" < program."startsAt"
            OR topic."executionEndsAt" > program."endsAt"
            OR topic."submissionStartsAt" < program."startsAt"
            OR topic."submissionEndsAt" > program."endsAt") AS "scheduleOutsideProgram",
        (SELECT count(*)::int FROM (
          SELECT "programId", "studentId" FROM "team_member" GROUP BY 1, 2 HAVING count(*) > 1
        ) AS duplicate) AS "duplicateMembership",
        (SELECT count(*)::int FROM "recruitment_application" AS recruitment
          JOIN "topic_application" AS application ON application."id" = recruitment."topicApplicationId"
          WHERE recruitment."studentId" <> application."studentId") AS "recruitmentStudentMismatch",
        (SELECT count(*)::int FROM "user" AS account
          LEFT JOIN "professor_allowlist" AS allowlist ON allowlist."email" = account."email" AND allowlist."revokedAt" IS NULL
          WHERE account."role" = 'PROFESSOR'::"UserRole" AND allowlist."id" IS NULL) AS "professorWithoutAllowlist",
        (SELECT count(*)::int FROM "team" AS team
          WHERE team."status" = 'CLOSED'::"TeamStatus" AND NOT EXISTS (
            SELECT 1 FROM "report" AS report
            JOIN "report_version" AS version ON version."reportId" = report."id"
            JOIN "approval_decision" AS decision ON decision."reportVersionId" = version."id"
            WHERE report."teamId" = team."id" AND report."type" = 'FINAL'::"ReportType"
              AND decision."decision" = 'APPROVED'::"ApprovalDecisionType"
          )) AS "closedTeamWithoutApproval",
        (SELECT count(*)::int FROM "team" AS team
          WHERE team."status" = 'CLOSED'::"TeamStatus" AND NOT EXISTS (
            SELECT 1 FROM "audit_log" AS audit
            WHERE audit."action" = 'TEAM_CLOSED'::"AuditAction" AND audit."targetId" = team."id"
          )) AS "closedTeamWithoutAudit"
    `);
    const failedIntegrityChecks = Object.entries(integrity).filter(([, failures]) => failures !== 0);
    if (failedIntegrityChecks.length > 0) {
      throw new Error(`데모 데이터 정합성 검증 실패: ${failedIntegrityChecks.map(([name, failures]) => `${name}=${failures}`).join(", ")}`);
    }
    const studentDemoTeams = await tx.team.findMany({
      where: {
        status: { not: "CLOSED" },
        members: { some: { studentId: ids.students[0] } },
      },
      select: {
        id: true,
        name: true,
        tasks: { select: { status: true } },
        reports: {
          select: {
            type: true,
            versions: {
              orderBy: { version: "desc" },
              select: { version: true, decision: { select: { decision: true } } },
            },
          },
        },
        artifacts: { select: { id: true } },
      },
    });
    if (studentDemoTeams.length !== 1) {
      throw new Error(`학생 데모 계정의 진행 팀은 하나여야 합니다: ${studentDemoTeams.length}`);
    }
    const studentDemoTeam = studentDemoTeams[0];
    const taskStatuses = new Set(studentDemoTeam.tasks.map(({ status }) => status));
    if (studentDemoTeam.name !== "배리어프리 캠퍼스"
      || studentDemoTeam.tasks.length < 6
      || !["TODO", "IN_PROGRESS", "DONE"].every((status) => taskStatuses.has(status as "TODO" | "IN_PROGRESS" | "DONE"))) {
      throw new Error("학생 데모 프로젝트의 팀명 또는 할 일 상태 구성이 불완전합니다.");
    }
    const reportsByType = new Map(studentDemoTeam.reports.map((report) => [report.type, report]));
    if (!["START", "MIDTERM", "FINAL"].every((type) => reportsByType.get(type as "START" | "MIDTERM" | "FINAL")?.versions.length)) {
      throw new Error("학생 데모 프로젝트의 착수·중간·최종 보고서 제출본이 모두 필요합니다.");
    }
    if (reportsByType.get("START")?.versions[0]?.decision?.decision !== "APPROVED"
      || reportsByType.get("MIDTERM")?.versions[0]?.decision?.decision !== "APPROVED"
      || reportsByType.get("FINAL")?.versions[0]?.decision !== null) {
      throw new Error("학생 데모 프로젝트의 보고서 승인 흐름이 예상 상태와 다릅니다.");
    }
    if (studentDemoTeam.artifacts.length < 3) {
      throw new Error("학생 데모 프로젝트에는 포스터·소스 코드·시연 영상 결과물이 필요합니다.");
    }
    return {
      localViewer: localViewer ? { name: localViewer.name, email: localViewer.email } : null,
      connectedToDemoProject: Boolean(localViewerApplicationId),
      verificationResidueRemoved: verificationPrograms.length,
      topicApplications: acceptedApplicationRows.length + reviewApplicationRows.length + (localViewerApplicationId ? 1 : 0),
      studentTeams: ids.studentTeams.length,
      studentTeamRecruitmentPosts: ids.studentTeamRecruitments.length,
      studentTeamRecruitmentApplications: ids.studentTeamRecruitmentApplications.length,
      activeReports: ids.activeReports.length,
      activeReportVersions: ids.activeReportVersions.length,
      activeArtifacts: ids.activeArtifacts.length,
      announcements: ids.announcements.length,
      studentDemoProject: {
        teamName: studentDemoTeam.name,
        tasks: studentDemoTeam.tasks.length,
        reports: studentDemoTeam.reports.length,
        reportVersions: studentDemoTeam.reports.reduce((count, report) => count + report.versions.length, 0),
        artifacts: studentDemoTeam.artifacts.length,
      },
    };
  }, {
    maxWait: 30_000,
    timeout: 600_000,
  });

  console.log(JSON.stringify({
    activePrograms: 4,
    activeTopics: 6,
    activeTeams: 3,
    topicApplications: seedResult.topicApplications,
    recruitmentPosts: 2,
    recruitmentApplications: 2,
    studentTeams: seedResult.studentTeams,
    studentTeamRecruitmentPosts: seedResult.studentTeamRecruitmentPosts,
    studentTeamRecruitmentApplications: seedResult.studentTeamRecruitmentApplications,
    notifications: seedResult.connectedToDemoProject ? 4 : 0,
    archivedProjects: archivedProjectCount,
    approvedFinalReports: archivedProjectCount,
    activeReports: seedResult.activeReports,
    activeReportVersions: seedResult.activeReportVersions,
    artifacts: artifactCount + seedResult.activeArtifacts,
    announcements: seedResult.announcements,
    studentDemoProject: seedResult.studentDemoProject,
    localViewer: seedResult.localViewer ? { ...seedResult.localViewer, connectedToDemoProject: seedResult.connectedToDemoProject } : null,
    verificationResidueRemoved: seedResult.verificationResidueRemoved,
  }));
}

seed()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
