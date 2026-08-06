import "dotenv/config";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

import { Prisma, PrismaClient, UserRole } from "../src/generated/prisma/client";
import { objectStorageBucket, s3 } from "../src/shared/infrastructure/object-storage/s3";
import { opusArchivedProjects } from "./opus-project-catalog";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
if (process.env.ALLOW_LOCAL_DEMO_SEED !== "true") {
  throw new Error("ALLOW_LOCAL_DEMO_SEED=true인 로컬 환경에서만 실행할 수 있습니다.");
}
const databaseUrl = new URL(connectionString);
if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname)) {
  throw new Error("데모 데이터는 로컬 PostgreSQL에만 생성할 수 있습니다.");
}
const s3Endpoint = process.env.S3_ENDPOINT;
if (!s3Endpoint || !["127.0.0.1", "localhost"].includes(new URL(s3Endpoint).hostname)) {
  throw new Error("데모 결과물은 로컬 S3 호환 저장소에만 생성할 수 있습니다.");
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
  programs: Array.from({ length: 12 }, (_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
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
  milestones: Array.from({ length: 10 }, (_, index) => `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  discussions: Array.from({ length: 4 }, (_, index) => `c0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  artifacts: Array.from({ length: artifactCount }, (_, index) => `d0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  storedFiles: Array.from({ length: archivedProjectCount * 2 }, (_, index) => `e0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reports: Array.from({ length: archivedProjectCount }, (_, index) => `f0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reportVersions: Array.from({ length: archivedProjectCount }, (_, index) => `f1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  approvalDecisions: Array.from({ length: archivedProjectCount }, (_, index) => `f2000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeReports: Array.from({ length: 3 }, (_, index) => `f3000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeReportVersions: Array.from({ length: 2 }, (_, index) => `f4000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeApprovalDecisions: Array.from({ length: 2 }, (_, index) => `f5000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  activeStoredFiles: Array.from({ length: 3 }, (_, index) => `e1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
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
  `demo/teams/${ids.teams[0]}/midterm-report.pdf`,
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
      "모두의 길 착수 보고서",
      "캠퍼스 이동약자를 위한 실내 길찾기",
      "교내 접근성 경로 조사 범위와 데이터 수집 기준",
      "정하늘 학생이 현장 조사 체크리스트와 초기 화면 흐름을 정리한 제출본",
    ], fontPath),
    createDemoPdf([
      "모두의 길 중간 보고서",
      "캠퍼스 이동약자를 위한 실내 길찾기",
      "경사로·엘리베이터·자동문 데이터 정합성 검증 결과",
      "프로토타입 사용자 테스트 의견과 다음 개선 계획을 반영한 1차 제출본",
    ], fontPath),
  ]);
  const activeArtifactPdf = await createDemoPdf([
    "모두의 길 프로젝트 포스터",
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
    // 검증 프로세스가 강제 종료돼도 전용 이메일 표식이 있는 임시 계정과 그 주기만 회수한다.
    // 학년도 숫자만으로 사용자 데이터를 검증 데이터라고 추정하지 않는다.
    const verificationUsers = await tx.user.findMany({
      where: { email: { startsWith: "verification+" } },
      select: { id: true },
    });
    const verificationUserIds = verificationUsers.map(({ id }) => id);
    const verificationCycles = await tx.academicCycle.findMany({
      where: { OR: [
        { programs: { some: { createdById: { in: verificationUserIds } } } },
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
    const verificationCycleIds = verificationCycles.map(({ id }) => id);
    if (verificationCycleIds.length > 0) {
      await tx.team.deleteMany({ where: { academicCycleId: { in: verificationCycleIds } } });
      await tx.topicApplication.deleteMany({ where: { topic: { academicCycleId: { in: verificationCycleIds } } } });
      await tx.topic.deleteMany({ where: { academicCycleId: { in: verificationCycleIds } } });
      await tx.projectProgram.deleteMany({ where: { academicCycleId: { in: verificationCycleIds } } });
      await tx.academicCycle.deleteMany({ where: { id: { in: verificationCycleIds } } });
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
    await tx.artifact.deleteMany({ where: { id: { in: [...ids.artifacts, ...ids.activeArtifacts] } } });
    await tx.approvalDecision.deleteMany({ where: { id: { in: [...ids.approvalDecisions, ...ids.activeApprovalDecisions] } } });
    await tx.reportVersion.deleteMany({ where: { id: { in: [...ids.reportVersions, ...ids.activeReportVersions] } } });
    await tx.report.deleteMany({ where: { id: { in: [...ids.reports, ...ids.activeReports] } } });
    await tx.storedFile.deleteMany({ where: { id: { in: [...ids.storedFiles, ...ids.activeStoredFiles] } } });
    await tx.recruitmentApplication.deleteMany({ where: { postId: { in: ids.recruitments } } });
    await tx.recruitmentPost.deleteMany({ where: { id: { in: ids.recruitments } } });
    await tx.studentTeam.deleteMany({ where: { id: { in: ids.studentTeams } } });
    await tx.teamMember.deleteMany({ where: { id: { in: ids.members } } });
    await tx.milestone.deleteMany({ where: { id: { in: ids.milestones } } });
    await tx.discussionPost.deleteMany({ where: { id: { in: ids.discussions } } });
    await tx.team.deleteMany({ where: { id: { in: ids.teams } } });
    await tx.topicApplication.deleteMany({ where: { id: { in: [...ids.applications, ids.localViewerApplication] } } });
    await tx.topic.deleteMany({ where: { id: { in: ids.topics } } });

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
        title: "2026학년도 2학기 프로젝트 운영 일정 안내",
        content: "프로젝트 주제 확정과 팀 구성, 보고서 제출 일정을 안내합니다.\n\n- 주제 및 팀 구성 확정: 8월 14일\n- 프로젝트 수행 시작: 8월 17일\n- 중간보고서 제출: 10월 16일\n- 최종보고서 제출: 12월 11일\n\n프로그램별 세부 일정은 각 프로젝트 화면에서 확인해 주세요.",
        createdAt: new Date("2026-08-03T09:00:00+09:00"),
      },
      {
        authorId: ids.professors[0],
        title: "중간보고서 제출 및 지도교수 확인 안내",
        content: "중간보고서는 팀장이 제출한 뒤 지도교수 확인까지 완료해야 합니다. 제출 전 팀원별 진행 내용과 다음 단계 계획이 포함되어 있는지 확인해 주세요.\n\n보완 요청을 받은 경우 의견을 반영한 새 버전을 제출할 수 있습니다.",
        createdAt: new Date("2026-08-01T14:30:00+09:00"),
      },
      {
        authorId: ids.admin,
        title: "팀 구성 확정 전 확인 사항",
        content: "팀 구성 확정 전 모든 팀원의 참여 상태와 담당 역할을 확인해 주세요. 중복 참여나 미응답 초대가 남아 있으면 팀 확정이 제한될 수 있습니다.\n\n문제가 지속되면 학과 프로젝트 담당자에게 문의해 주세요.",
        createdAt: new Date("2026-07-30T11:00:00+09:00"),
      },
      {
        authorId: ids.professors[1],
        title: "프로젝트 결과물 공개 범위 안내",
        content: "최종 승인된 프로젝트는 결과물 공개 여부를 선택할 수 있습니다. 공개 링크와 첨부 파일에 개인정보, 비공개 저장소 주소, 접근 토큰이 포함되지 않았는지 등록 전에 반드시 확인해 주세요.",
        createdAt: new Date("2026-07-28T16:20:00+09:00"),
      },
      {
        authorId: ids.admin,
        title: "프로젝트 관리 시스템 정기 점검 안내",
        content: "안정적인 서비스 운영을 위해 8월 8일 토요일 오전 2시부터 4시까지 정기 점검을 진행합니다. 점검 시간에는 로그인과 보고서 제출이 일시적으로 제한될 수 있습니다.",
        createdAt: new Date("2026-07-25T10:00:00+09:00"),
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

    async function cycle(academicYear: number, term: "FIRST" | "SECOND") {
      return tx.academicCycle.upsert({
        where: { academicYear_term: { academicYear, term } },
        update: {},
        create: { academicYear, term },
      });
    }
    const currentCycle = await cycle(2026, "FIRST");
    const secondCycle = await cycle(2026, "SECOND");
    const pastCycles = [
      await cycle(2025, "FIRST"),
      await cycle(2024, "FIRST"),
      await cycle(2023, "FIRST"),
      await cycle(2022, "FIRST"),
    ];

    async function program(input: {
      id: string; academicCycleId: string; name: string; category: string; description: string;
      startsAt: Date; endsAt: Date; status: "OPEN" | "CLOSED";
    }) {
      const sameName = await tx.projectProgram.findUnique({
        where: { academicCycleId_name: { academicCycleId: input.academicCycleId, name: input.name } },
        select: { id: true },
      });
      if (sameName && sameName.id !== input.id) {
        throw new Error(`사용자 프로그램과 이름이 겹쳐 데모 시드를 중단합니다: ${input.name}`);
      }
      return tx.projectProgram.upsert({
        where: { id: input.id },
        update: { academicCycleId: input.academicCycleId, name: input.name, category: input.category, description: input.description, startsAt: input.startsAt, endsAt: input.endsAt, status: input.status, openedAt: input.startsAt },
        create: { ...input, createdById: ids.professors[0], openedAt: input.startsAt },
      });
    }
    const activePrograms = [
      await program({ id: ids.programs[0], academicCycleId: currentCycle.id, name: "CSE 캡스톤디자인 2026", category: opusProgramCategories.capstone, description: "전공 지식을 실제 문제 해결에 적용하고, 지도교수 피드백과 단계별 보고를 거쳐 결과물을 완성하는 팀 프로젝트", startsAt: new Date("2026-03-01T00:00:00+09:00"), endsAt: new Date("2026-12-20T23:59:59+09:00"), status: "OPEN" }),
      await program({ id: ids.programs[1], academicCycleId: currentCycle.id, name: "제7회 PNU 창의융합AI해커톤", category: opusProgramCategories.hackathon, description: "서로 다른 전공의 학생이 AI를 활용해 캠퍼스와 지역사회의 문제를 정의하고 작동하는 프로토타입으로 검증하는 해커톤", startsAt: new Date("2026-05-01T00:00:00+09:00"), endsAt: new Date("2026-10-31T23:59:59+09:00"), status: "OPEN" }),
      await program({ id: ids.programs[2], academicCycleId: currentCycle.id, name: "PNU AI부스터 2기", category: opusProgramCategories.aiBooster, description: "AI 기초 학습부터 데이터 준비, 모델 활용, 서비스 구현까지 단계적으로 경험하는 프로젝트형 역량 강화 프로그램", startsAt: new Date("2026-04-01T00:00:00+09:00"), endsAt: new Date("2026-11-30T23:59:59+09:00"), status: "OPEN" }),
      await program({ id: ids.programs[11], academicCycleId: secondCycle.id, name: "PNU 데이터 프로젝트 2026", category: opusProgramCategories.aiBooster, description: "캠퍼스 데이터를 수집·분석하고 실제 사용자가 활용할 수 있는 서비스로 구현하는 프로젝트형 데이터 교육 프로그램", startsAt: new Date("2026-07-01T00:00:00+09:00"), endsAt: new Date("2026-12-20T23:59:59+09:00"), status: "OPEN" }),
    ];
    const pastPrograms = [
      await program({ id: ids.programs[3], academicCycleId: pastCycles[0].id, name: "CSE 캡스톤디자인 2025", category: opusProgramCategories.capstone, description: "2025학년도 컴퓨터공학전공 캡스톤 프로젝트의 주제 제안, 팀 구성, 중간 점검과 최종 결과물을 관리한 프로그램", startsAt: new Date("2025-03-01T00:00:00+09:00"), endsAt: new Date("2025-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[4], academicCycleId: pastCycles[0].id, name: "제6회 PNU 창의융합SW해커톤", category: opusProgramCategories.hackathon, description: "소프트웨어로 캠퍼스와 지역사회의 문제를 해결하기 위해 아이디어를 구체화하고 프로토타입을 제작한 창의융합 해커톤", startsAt: new Date("2025-05-01T00:00:00+09:00"), endsAt: new Date("2025-10-31T23:59:59+09:00"), status: "CLOSED" }),
      // OPUS 공개 목록에 없는 연도·회차는 과거 프로젝트 탐색을 풍부하게 하기 위한 데모 항목이다.
      await program({ id: ids.programs[5], academicCycleId: pastCycles[1].id, name: "CSE 캡스톤디자인 2024", category: opusProgramCategories.capstone, description: "2024학년도 캡스톤 프로젝트의 팀별 수행 과정과 최종 결과물을 모은 데모 프로그램", startsAt: new Date("2024-03-01T00:00:00+09:00"), endsAt: new Date("2024-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[6], academicCycleId: pastCycles[1].id, name: "PNU AI부스터 1기", category: opusProgramCategories.aiBooster, description: "데이터와 AI 기술을 실제 문제에 적용하며 모델 평가와 서비스 구현 경험을 쌓은 프로젝트형 교육 프로그램", startsAt: new Date("2024-04-01T00:00:00+09:00"), endsAt: new Date("2024-11-30T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[7], academicCycleId: pastCycles[2].id, name: "CSE 캡스톤디자인 2023", category: opusProgramCategories.capstone, description: "2023학년도 캡스톤 프로젝트의 제안서부터 최종 발표 자료까지 연결한 데모 프로그램", startsAt: new Date("2023-03-01T00:00:00+09:00"), endsAt: new Date("2023-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[8], academicCycleId: pastCycles[2].id, name: "카카오 테크 캠퍼스 1기", category: opusProgramCategories.kakaoTechCampus, description: "웹 서비스 기획, 개발, 협업과 배포를 한 흐름으로 경험한 산학 연계형 실무 프로젝트", startsAt: new Date("2023-04-01T00:00:00+09:00"), endsAt: new Date("2023-11-30T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[9], academicCycleId: pastCycles[3].id, name: "CSE 캡스톤디자인 2022", category: opusProgramCategories.capstone, description: "2022학년도 캡스톤 프로젝트 결과물을 검색하고 열람할 수 있도록 구성한 데모 프로그램", startsAt: new Date("2022-03-01T00:00:00+09:00"), endsAt: new Date("2022-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[10], academicCycleId: pastCycles[3].id, name: "PNU 오픈소스 SW 경진대회 2022", category: opusProgramCategories.hackathon, description: "오픈소스 기반 제품 개발과 공개 기여 경험을 결과물로 남긴 교내 소프트웨어 경진 프로그램", startsAt: new Date("2022-05-01T00:00:00+09:00"), endsAt: new Date("2022-11-30T23:59:59+09:00"), status: "CLOSED" }),
    ];

    // OPUS의 2026 캡스톤, 제7회 AI해커톤, AI부스터 2기 공개 API에는 아직 프로젝트가 없다.
    // 아래 진행 주제는 빈 화면 대신 모집·지원 흐름을 검증하기 위한 생성 데이터다.
    const activeTopics = [
      ["캠퍼스 이동약자를 위한 실내 길찾기", "강의동 내부의 경사로, 엘리베이터, 자동문 정보를 반영해 휠체어 사용자가 접근 가능한 경로를 안내합니다.", ["Next.js", "PostgreSQL", "PostGIS"], ["접근성", "지도 UI"], "프론트엔드 또는 공간 데이터 담당", "주 1회 대면 회의와 주 4시간 이상 개발", 4, 0, 0],
      ["강의실 혼잡도 예측 및 알림", "시간표와 익명 센서 데이터를 결합해 학습 공간의 혼잡도를 예측하고 한산한 공간을 추천합니다.", ["TypeScript", "Python"], ["시계열 분석", "데이터 시각화"], "데이터 분석 또는 웹 개발 담당", "화요일 저녁 정기 회의 참여", 4, 3, 1],
      ["학과 프로젝트 운영 기록 자동화", "마일스톤, 보고서 승인, 결과물을 한 흐름으로 연결해 캡스톤 운영 과정의 누락을 줄입니다.", ["Next.js", "Prisma"], ["UX 리서치", "테스트 자동화"], "제품 설계 또는 풀스택 개발 담당", "주 2회 온라인 진행 공유", 5, 0, 2],
      ["재난문자 기반 교내 대피 안내 에이전트", "공공 재난문자와 교내 건물·출입구 정보를 결합해 상황별 행동 요령과 안전한 대피 경로를 설명하는 AI 서비스를 구현합니다.", ["React", "공공데이터 API"], ["RAG", "지도 UI"], "AI 서비스 또는 데이터 연동 담당", "해커톤 집중 개발 주간 참여 가능", 4, 1, 0],
      ["캠퍼스 행사 수요 예측 AI", "이전 행사 신청, 학사 일정과 날씨 데이터를 이용해 예상 참여 인원과 준비 물품 수량을 제안하는 대시보드를 만듭니다.", ["Python", "SQL"], ["예측 모델", "데이터 시각화"], "데이터 분석 또는 서비스 기획 담당", "격주 목요일 회의와 최종 해커톤 참여", 3, 1, 1],
      ["논문 초록 한영 번역 품질 비교 도구", "로컬 LLM의 번역 결과를 용어 일관성, 내용 누락과 문장 가독성 기준으로 비교하고 검수 의견을 축적하는 도구를 만듭니다.", ["TypeScript", "Ollama"], ["NLP", "평가 설계"], "번역 평가 또는 웹 개발 담당", "주 1회 온라인 실습과 월 1회 성과 공유", 4, 2, 2],
    ] as const;
    for (const [index, data] of activeTopics.entries()) {
      const [title, description, requiredSkills, preferredSkills, roleExpectations, availabilityRequirement, capacity, programIndex, professorIndex] = data;
      const schedules = [
        {
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"), recruitmentEndsAt: new Date("2026-08-15T23:59:59+09:00"),
          executionStartsAt: new Date("2026-08-01T00:00:00+09:00"), executionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-12-15T23:59:59+09:00"),
        },
        {
          recruitmentStartsAt: new Date("2026-06-15T00:00:00+09:00"), recruitmentEndsAt: new Date("2026-07-31T23:59:59+09:00"),
          executionStartsAt: new Date("2026-07-20T00:00:00+09:00"), executionEndsAt: new Date("2026-10-15T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-10-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-10-31T23:59:59+09:00"),
        },
        {
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"), recruitmentEndsAt: new Date("2026-08-10T23:59:59+09:00"),
          executionStartsAt: new Date("2026-07-15T00:00:00+09:00"), executionEndsAt: new Date("2026-11-10T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
        },
        {
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"), recruitmentEndsAt: new Date("2026-08-15T23:59:59+09:00"),
          executionStartsAt: new Date("2026-08-01T00:00:00+09:00"), executionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-12-15T23:59:59+09:00"),
        },
      ] as const;
      const schedule = schedules[programIndex];
      const applicationMode = index % 3 === 0 ? "INDIVIDUAL_OR_TEAM" : index % 3 === 1 ? "INDIVIDUAL_ONLY" : "TEAM_ONLY";
      const applicationQuestions = [
        { label: "이 주제에 지원한 이유와 기여하고 싶은 내용을 작성해 주세요.", maxLength: 800, required: true, position: 0 },
        { label: "관련 경험이나 수행한 프로젝트가 있다면 작성해 주세요.", maxLength: 1000, required: false, position: 1 },
      ];
      await tx.topic.upsert({
        where: { id: ids.topics[index] },
        update: {
          academicCycleId: activePrograms[programIndex].academicCycleId, programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex], managerId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity, applicationMode,
          ...schedule,
          status: "PUBLISHED", publishedAt: new Date(`2026-06-${String(index + 10).padStart(2, "0")}T09:00:00+09:00`),
        },
        create: {
          id: ids.topics[index], academicCycleId: activePrograms[programIndex].academicCycleId, programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex], managerId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity, applicationMode,
          applicationQuestions: { create: applicationQuestions },
          ...schedule,
          status: "PUBLISHED", publishedAt: new Date(`2026-06-${String(index + 10).padStart(2, "0")}T09:00:00+09:00`),
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
        project.cycleIndex,
        project.programIndex,
        ids.opusAdvisors[advisorIndex],
        project.advisorRole,
        project.memberNames.length,
      ] as const;
    });
    for (const [offset, data] of pastTopics.entries()) {
      const [title, description, requiredSkills, preferredSkills, cycleIndex, programIndex, professorId, advisorRole, capacity] = data;
      const topicIndex = offset + 6;
      const targetCycle = pastCycles[cycleIndex];
      const targetProgram = pastPrograms[programIndex];
      await tx.topic.upsert({
        where: { id: ids.topics[topicIndex] },
        update: {
          academicCycleId: targetCycle.id, programId: targetProgram.id, authorId: professorId, managerId: professorId, advisorRole, title, description,
          requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations: "팀 역할 분담 완료", availabilityRequirement: "프로젝트 종료",
          capacity, recruitmentStartsAt: targetProgram.startsAt, recruitmentEndsAt: new Date(targetProgram.startsAt.getTime() + 60 * 86_400_000),
          executionStartsAt: new Date(targetProgram.startsAt.getTime() + 30 * 86_400_000), executionEndsAt: new Date(targetProgram.endsAt.getTime() - 30 * 86_400_000),
          submissionStartsAt: new Date(targetProgram.endsAt.getTime() - 60 * 86_400_000), submissionEndsAt: targetProgram.endsAt,
          status: "CLOSED", publishedAt: targetProgram.startsAt,
        },
        create: {
          id: ids.topics[topicIndex], academicCycleId: targetCycle.id, programId: targetProgram.id, authorId: professorId, managerId: professorId, advisorRole, title, description,
          requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations: "팀 역할 분담 완료", availabilityRequirement: "프로젝트 종료",
          capacity, recruitmentStartsAt: targetProgram.startsAt, recruitmentEndsAt: new Date(targetProgram.startsAt.getTime() + 60 * 86_400_000),
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
      // 2026년 진행 팀. 정하늘 학생은 서로 다른 학기의 프로젝트 두 개에 참여한다.
      [0, 0], [0, 1], [0, 3], [0, 4], [1, 0], [2, 2],
      // OPUS 공개 상세에 등록된 실제 참여자 이름을 프로젝트별로 그대로 연결한다.
      ...pastAcceptedApplicationRows,
    ];
    const reviewApplicationRows = [
      [1, 5, "PENDING", "시계열 데이터를 정리하고 예측 결과를 이해하기 쉬운 화면으로 표현해 보고 싶습니다."],
      [1, 6, "REJECTED", "센서 수집 경험을 바탕으로 혼잡도 데이터의 수집 품질을 높이겠습니다."],
      [3, 7, "PENDING", "공공 데이터를 안정적으로 정제하고 상황별 안내 문구의 정확성을 검증하겠습니다."],
      [4, 8, "REJECTED", "서버 개발 경험을 살려 행사 수요 데이터의 수집 과정을 안정적으로 만들겠습니다."],
      [5, 9, "PENDING", "번역 결과의 차이를 한눈에 비교할 수 있는 정보 구조와 평가 화면을 설계하겠습니다."],
      [2, 10, "PENDING", "인증과 권한 경계를 점검해 학과 프로젝트 기록을 안전하게 관리하고 싶습니다."],
      [2, 11, "REJECTED", "학생 인터뷰 결과를 바탕으로 처음 쓰는 사람도 이해할 수 있는 흐름을 설계하겠습니다."],
    ] as const;
    function acceptedApplicationTiming(topicIndex: number) {
      const createdAt = topicIndex < 6
        ? new Date("2026-07-05T12:00:00+09:00")
        : new Date(pastPrograms[pastTopics[topicIndex - 6][5]].startsAt.getTime() + 14 * 86_400_000);
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
        where: { academicCycleId_studentId: { academicCycleId: currentCycle.id, studentId: localViewer.id } },
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
            message: "학과 구성원이 반복해서 겪는 프로젝트 운영의 불편을 실제 사용 흐름과 코드로 함께 해결하고 싶습니다.",
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
      [0, currentCycle.id, ids.professors[0], "모두의 길", "CONFIRMED"],
      [2, currentCycle.id, ids.professors[2], "프로젝트 모아", "FORMING"],
      ...pastTopics.map((topic, offset) => [offset + 6, pastCycles[topic[4]].id, topic[6], pastTeamNames[offset], "CLOSED"] as const),
      [1, secondCycle.id, ids.professors[1], "캠퍼스 플로우", "CONFIRMED"],
    ];
    await tx.team.createMany({ data: teamRows.map(([topicIndex, academicCycleId, professorId, name, status], index) => ({
      id: ids.teams[index], academicCycleId, topicId: ids.topics[topicIndex], professorId, name, status,
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
        id: ids.members[index], teamId: ids.teams[teamIndex], academicCycleId: teamRows[teamIndex][1], topicId: ids.topics[topicIndex],
        studentId: ids.students[studentIndex], applicationId: ids.applications[index], joinedAt: acceptedApplicationTiming(topicIndex).decidedAt,
      };
    }) });
    if (localViewer && localViewerApplicationId) {
      await tx.teamMember.create({ data: {
        id: ids.members[acceptedApplicationRows.length],
        teamId: ids.teams[1],
        academicCycleId: currentCycle.id,
        topicId: ids.topics[2],
        studentId: localViewer.id,
        applicationId: localViewerApplicationId,
        joinedAt: new Date("2026-07-11T15:00:00+09:00"),
      } });
    }

    const activeReportSubmittedAt = [
      new Date("2026-08-24T17:30:00+09:00"),
      new Date("2026-10-10T20:10:00+09:00"),
    ];
    const activeReportFiles = [
      {
        id: ids.activeStoredFiles[0],
        objectKey: activeReportObjectKeys[0],
        originalName: "모두의-길-착수보고서.pdf",
        body: activeReportPdfs[0],
        readyAt: activeReportSubmittedAt[0],
        purpose: "REPORT" as const,
      },
      {
        id: ids.activeStoredFiles[1],
        objectKey: activeReportObjectKeys[1],
        originalName: "모두의-길-중간보고서-1차.pdf",
        body: activeReportPdfs[1],
        readyAt: activeReportSubmittedAt[1],
        purpose: "REPORT" as const,
      },
      {
        id: ids.activeStoredFiles[2],
        objectKey: activeArtifactObjectKey,
        originalName: "모두의-길-프로젝트-포스터.pdf",
        body: activeArtifactPdf,
        readyAt: new Date("2026-11-05T19:00:00+09:00"),
        purpose: "ARTIFACT" as const,
      },
    ];
    await tx.storedFile.createMany({ data: activeReportFiles.map((file) => ({
      id: file.id,
      teamId: ids.teams[0],
      ownerId: ids.students[0],
      purpose: file.purpose,
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
      { id: ids.activeReports[0], teamId: ids.teams[0], type: "START", dueAt: new Date("2026-08-31T23:59:59+09:00"), createdAt: new Date("2026-07-20T10:00:00+09:00") },
      { id: ids.activeReports[1], teamId: ids.teams[0], type: "MIDTERM", dueAt: new Date("2026-10-15T23:59:59+09:00"), createdAt: new Date("2026-07-20T10:00:00+09:00") },
      { id: ids.activeReports[2], teamId: ids.teams[0], type: "FINAL", dueAt: new Date("2026-12-10T23:59:59+09:00"), createdAt: new Date("2026-07-20T10:00:00+09:00") },
    ] });
    await tx.reportVersion.createMany({ data: [
      {
        id: ids.activeReportVersions[0],
        reportId: ids.activeReports[0],
        version: 1,
        fileId: ids.activeStoredFiles[0],
        submitterId: ids.students[0],
        description: "현장 조사 범위, 접근성 데이터 수집 기준, 초기 사용자 흐름을 정리했습니다.",
        submittedAt: activeReportSubmittedAt[0],
      },
      {
        id: ids.activeReportVersions[1],
        reportId: ids.activeReports[1],
        version: 1,
        fileId: ids.activeStoredFiles[1],
        submitterId: ids.students[0],
        description: "경로 데이터 정합성 검증과 1차 사용성 테스트 결과를 반영했습니다.",
        submittedAt: activeReportSubmittedAt[1],
      },
    ] });
    await tx.approvalDecision.createMany({ data: [
      {
        id: ids.activeApprovalDecisions[0],
        reportVersionId: ids.activeReportVersions[0],
        reviewerId: ids.professors[0],
        decision: "APPROVED",
        comment: "조사 범위와 접근성 기준이 명확합니다. 계획대로 프로토타입 검증을 진행해 주세요.",
        decidedAt: new Date("2026-08-26T11:00:00+09:00"),
      },
      {
        id: ids.activeApprovalDecisions[1],
        reportVersionId: ids.activeReportVersions[1],
        reviewerId: ids.professors[0],
        decision: "REVISION_REQUESTED",
        comment: "엘리베이터 운영 시간과 공사로 막힌 구간의 갱신 주기를 보완해 다시 제출해 주세요.",
        decidedAt: new Date("2026-10-12T14:30:00+09:00"),
      },
    ] });
    await tx.artifact.createMany({ data: [
      {
        id: ids.activeArtifacts[0],
        teamId: ids.teams[0],
        registeredById: ids.students[0],
        type: "POSTER",
        title: "모두의 길 프로젝트 소개 포스터",
        fileId: ids.activeStoredFiles[2],
        createdAt: new Date("2026-11-05T19:00:00+09:00"),
      },
      {
        id: ids.activeArtifacts[1],
        teamId: ids.teams[0],
        registeredById: ids.students[0],
        type: "SOURCE_CODE",
        title: "접근성 길찾기 프로토타입 소스 코드",
        externalUrl: "https://example.com/mock/modu-ui-path/source",
        createdAt: new Date("2026-11-06T18:00:00+09:00"),
      },
      {
        id: ids.activeArtifacts[2],
        teamId: ids.teams[0],
        registeredById: ids.students[0],
        type: "PRESENTATION_VIDEO",
        title: "교내 접근성 경로 시연 영상",
        externalUrl: "https://example.com/mock/modu-ui-path/demo",
        createdAt: new Date("2026-11-07T18:00:00+09:00"),
      },
    ] });

    for (const [reportIndex, teamIndex] of closedTeamIndexes.entries()) {
      const topicIndex = teamRows[teamIndex][0];
      const programIndex = pastTopics[topicIndex - 6][5];
      const submitterIndex = pastStudentIndexesByProject[reportIndex][0];
      const submittedAt = new Date(pastPrograms[programIndex].endsAt.getTime() - 14 * 86_400_000);
      const approvedAt = new Date(submittedAt.getTime() + 5 * 86_400_000);
      const objectKey = `demo/teams/${ids.teams[teamIndex]}/final-report.pdf`;
      const reportPdf = demoReportPdfs[reportIndex];
      await tx.storedFile.create({ data: {
        id: ids.storedFiles[reportIndex], teamId: ids.teams[teamIndex], ownerId: ids.students[submitterIndex], purpose: "REPORT", status: "READY",
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
        id: ids.recruitments[0], teamId: ids.teams[1], authorId: recruitmentAuthorId, title: "사용자 흐름을 함께 설계할 프론트엔드 팀원 모집",
        content: "교수와 학생 인터뷰 결과를 바탕으로 프로젝트 탐색부터 결과물 열람까지의 반응형 화면을 함께 구현합니다.", requiredSkills: ["React", "CSS", "접근성"],
        roleNeeded: "프론트엔드 개발과 사용성 검증", availability: "수요일 19시 정기 회의, 주 4시간 이상", status: "OPEN",
        createdAt: new Date("2026-07-12T18:00:00+09:00"),
      },
      {
        id: ids.recruitments[1], teamId: ids.teams[1], authorId: recruitmentAuthorId, title: "프로젝트 기록 구조를 다듬을 백엔드 팀원 모집",
        content: "주제 지원부터 팀 대화, 보고서 승인, 결과물 공개까지 끊기지 않도록 데이터 모델과 서버 로직을 함께 설계합니다.", requiredSkills: ["TypeScript", "PostgreSQL"],
        roleNeeded: "백엔드 개발과 테스트 자동화", availability: "주 1회 온라인 회의, 비동기 코드 리뷰", status: "OPEN",
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
        name: "코드웨이브",
        description: "사용자 문제를 빠르게 검증하고 접근성 높은 웹 제품을 만드는 팀입니다.",
        leaderId: ids.students[0],
        createdAt: new Date("2026-07-03T10:00:00+09:00"),
      },
      {
        id: ids.studentTeams[1],
        name: "데이터 브릿지",
        description: "교내 데이터를 분석해 학생이 바로 활용할 수 있는 정보 서비스로 연결합니다.",
        leaderId: ids.students[5],
        createdAt: new Date("2026-07-06T14:00:00+09:00"),
      },
      {
        id: ids.studentTeams[2],
        name: "캠퍼스 메이커스",
        description: "캠퍼스 생활의 반복적인 불편을 인터뷰와 프로토타입으로 해결합니다.",
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
        title: "접근성 높은 프로젝트 탐색 화면을 함께 만들 프론트엔드 팀원",
        content: "사용자 인터뷰 결과를 화면 구조로 옮기고 키보드와 모바일 환경에서도 편하게 사용할 수 있도록 개선합니다.",
        requiredSkills: ["React", "TypeScript", "접근성"],
        roleNeeded: "프론트엔드 개발",
        availability: "화·목 19시 이후, 주말 협의",
        capacity: 5,
        status: "OPEN",
        createdAt: new Date("2026-07-20T10:00:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitments[1],
        teamId: ids.studentTeams[1],
        authorId: ids.students[5],
        title: "캠퍼스 데이터를 서비스로 연결할 데이터 분석 팀원",
        content: "교내 공개 데이터를 정제하고 학생이 이해하기 쉬운 지표와 시각화로 만드는 작업을 함께합니다.",
        requiredSkills: ["Python", "SQL", "데이터 시각화"],
        roleNeeded: "데이터 분석과 시각화",
        availability: "월·수 저녁 온라인, 격주 토요일",
        capacity: 4,
        status: "OPEN",
        createdAt: new Date("2026-07-21T13:00:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitments[2],
        teamId: ids.studentTeams[2],
        authorId: studentTeamViewer.id,
        title: "캠퍼스 생활 문제를 함께 검증할 서비스 기획 팀원",
        content: "학생 인터뷰를 진행하고 문제의 우선순위를 정리해 짧은 주기로 프로토타입을 검증합니다.",
        requiredSkills: ["Figma", "사용자 조사", "문서화"],
        roleNeeded: "서비스 기획과 사용자 조사",
        availability: "수요일 19시 정기 회의, 비동기 협업",
        capacity: 5,
        status: "OPEN",
        createdAt: new Date("2026-07-22T16:00:00+09:00"),
      },
      {
        id: ids.studentTeamRecruitments[3],
        teamId: ids.studentTeams[0],
        authorId: ids.students[0],
        title: "초기 사용자 인터뷰 기록을 정리할 팀원",
        content: "완료된 초기 조사 기록을 분류하고 다음 실험의 기준을 정리했습니다.",
        requiredSkills: ["Notion", "인터뷰"],
        roleNeeded: "사용자 조사 기록 정리",
        availability: "온라인 비동기 협업",
        capacity: 3,
        status: "CLOSED",
        createdAt: new Date("2026-07-08T12:00:00+09:00"),
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
        message: "보안과 인프라 관점에서 프로토타입의 운영 위험을 함께 점검하겠습니다.",
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
        message: "사용자 조사 결과를 구조화하고 다음 검증 항목을 정리하고 싶습니다.",
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
        message: "데이터 분석 결과가 실제 학생의 의사결정으로 이어지도록 화면과 사용자 흐름을 함께 설계하겠습니다.",
        skills: ["Next.js", "Figma", "TypeScript"],
        desiredRole: "프론트엔드 개발과 사용자 검증",
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
        message: "데이터를 실제 사용자가 이해할 수 있는 화면으로 만드는 역할을 맡고 싶습니다.",
        skills: ["TypeScript", "PostgreSQL", "데이터 시각화"],
        desiredRole: "데이터 시각화와 프론트엔드 연동",
        availability: "평일 저녁, 주말 협의 가능",
        status: "PENDING",
        createdAt: new Date("2026-07-23T20:00:00+09:00"),
      });
    }
    await tx.studentTeamRecruitmentApplication.createMany({
      data: studentTeamRecruitmentApplicationRows,
    });

    await tx.milestone.createMany({ data: [
      { id: ids.milestones[0], teamId: ids.teams[0], createdById: ids.students[0], title: "교내 접근성 경로 현장 조사", dueAt: new Date("2026-07-25T18:00:00+09:00"), status: "DONE" },
      { id: ids.milestones[1], teamId: ids.teams[0], createdById: ids.students[0], title: "길찾기 프로토타입 사용성 테스트", dueAt: new Date("2026-08-20T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.milestones[2], teamId: ids.teams[0], createdById: ids.students[1], title: "학내 지도 데이터 정합성 검증", dueAt: new Date("2026-09-10T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[3], teamId: ids.teams[1], createdById: ids.students[2], title: "교수·학생 인터뷰 5건 완료", dueAt: new Date("2026-07-22T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.milestones[4], teamId: ids.teams[1], createdById: ids.students[2], title: "핵심 사용자 흐름 와이어프레임 검증", dueAt: new Date("2026-08-12T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[5], teamId: ids.teams[1], createdById: ids.students[2], title: "프로젝트 탐색 화면 반응형 구현", dueAt: new Date("2026-08-26T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[6], teamId: ids.teams[1], createdById: ids.students[2], title: "지원·승인 통합 시나리오 테스트", dueAt: new Date("2026-09-09T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[7], teamId: ids.teams[ids.teams.length - 1], createdById: ids.students[0], title: "강의실 센서 데이터 품질 점검", dueAt: new Date("2026-08-18T18:00:00+09:00"), status: "DONE" },
      { id: ids.milestones[8], teamId: ids.teams[ids.teams.length - 1], createdById: ids.students[0], title: "혼잡도 예측 대시보드 프로토타입", dueAt: new Date("2026-09-05T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.milestones[9], teamId: ids.teams[ids.teams.length - 1], createdById: ids.students[0], title: "추천 정확도 사용자 검증", dueAt: new Date("2026-09-24T18:00:00+09:00"), status: "TODO" },
    ] });
    await tx.milestoneAssignee.createMany({ data: [
      { milestoneId: ids.milestones[0], userId: ids.students[0] },
      { milestoneId: ids.milestones[1], userId: ids.students[0] },
      { milestoneId: ids.milestones[1], userId: ids.students[1] },
      { milestoneId: ids.milestones[2], userId: ids.students[1] },
      { milestoneId: ids.milestones[3], userId: ids.students[2] },
      { milestoneId: ids.milestones[4], userId: ids.students[2] },
      { milestoneId: ids.milestones[4], userId: ids.students[3] },
      { milestoneId: ids.milestones[5], userId: ids.students[3] },
      { milestoneId: ids.milestones[6], userId: ids.students[2] },
      { milestoneId: ids.milestones[6], userId: ids.students[3] },
      { milestoneId: ids.milestones[7], userId: ids.students[0] },
      { milestoneId: ids.milestones[8], userId: ids.students[0] },
      { milestoneId: ids.milestones[9], userId: ids.students[0] },
    ] });
    await tx.discussionPost.createMany({ data: [
      { id: ids.discussions[0], teamId: ids.teams[0], authorId: ids.professors[0], content: "경로 정확도보다 접근 불가능한 구간을 명확히 설명하는 것을 우선해 주세요.", createdAt: new Date("2026-07-17T10:00:00+09:00") },
      { id: ids.discussions[1], teamId: ids.teams[1], authorId: ids.professors[2], content: "기능 목록보다 학생이 처음 들어와 주제를 찾고 팀에 합류하는 순서를 먼저 검증해 주세요.", createdAt: new Date("2026-07-14T10:00:00+09:00") },
      { id: ids.discussions[2], teamId: ids.teams[1], authorId: ids.students[2], content: "이번 주에는 프로그램을 별도 메뉴로 분리하지 않고 주제 필터로 이해되는지 확인하겠습니다.", createdAt: new Date("2026-07-15T13:30:00+09:00") },
      { id: ids.discussions[3], teamId: ids.teams[1], authorId: ids.professors[2], content: "지난 프로젝트의 결과물까지 같은 탐색 맥락에서 이어지는지 사용자 테스트 항목에 포함해 주세요.", createdAt: new Date("2026-07-16T11:00:00+09:00") },
    ] });
    if (localViewer && localViewerApplicationId) {
      await tx.notification.createMany({ data: [
        {
          recipientId: localViewer.id,
          type: "APPLICATION_RESULT",
          title: "프로젝트 참여가 확정되었습니다",
          body: "학과 프로젝트 운영 기록 자동화 프로젝트 팀에 합류했습니다. 팀 공간에서 다음 일정을 확인해 주세요.",
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
          title: "프로젝트 모아 마일스톤 마감 임박",
          body: "교수·학생 인터뷰 정리 마감이 가까워졌습니다. 마일스톤과 다음 할 일을 확인해 주세요.",
          href: `/teams/${ids.teams[1]}`,
          dedupeKey: `demo:viewer:milestone-deadline:${localViewer.id}`,
          createdAt: new Date("2026-07-16T09:00:00+09:00"),
        },
        {
          recipientId: localViewer.id,
          type: "SYSTEM",
          title: "지도교수의 새 피드백이 있습니다",
          body: "지난 프로젝트 결과물이 같은 탐색 맥락에서 이어지는지 사용자 테스트에 포함해 달라는 의견이 등록되었습니다.",
          href: `/teams/${ids.teams[1]}`,
          dedupeKey: `demo:viewer:professor-feedback:${localViewer.id}`,
          createdAt: new Date("2026-07-16T11:00:00+09:00"),
        },
      ] });
    }

    let nextArtifactIndex = archivedProjectCount;
    for (const [index, teamIndex] of closedTeamIndexes.entries()) {
      const ownerId = ids.students[pastStudentIndexesByProject[index][0]];
      const publishedAt = new Date(pastPrograms[pastTopics[teamRows[teamIndex][0] - 6][5]].endsAt.getTime() - 8 * 86_400_000);
      const objectKey = demoArtifactObjectKeys[index];
      const fileId = ids.storedFiles[index + closedTeamIndexes.length];
      const artifactPdf = demoArtifactPdfs[index];
      const artifactSeed = demoProjectDocuments[index];
      await tx.storedFile.create({ data: {
        id: fileId, teamId: ids.teams[teamIndex], ownerId, purpose: "ARTIFACT", status: "READY",
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
            OR topic."recruitmentEndsAt" > program."endsAt"
            OR topic."executionStartsAt" < program."startsAt"
            OR topic."executionEndsAt" > program."endsAt"
            OR topic."submissionStartsAt" < program."startsAt"
            OR topic."submissionEndsAt" > program."endsAt") AS "scheduleOutsideProgram",
        (SELECT count(*)::int FROM (
          SELECT "academicCycleId", "studentId" FROM "team_member" GROUP BY 1, 2 HAVING count(*) > 1
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
    return {
      localViewer: localViewer ? { name: localViewer.name, email: localViewer.email } : null,
      connectedToDemoProject: Boolean(localViewerApplicationId),
      verificationResidueRemoved: verificationCycles.length,
      topicApplications: acceptedApplicationRows.length + reviewApplicationRows.length + (localViewerApplicationId ? 1 : 0),
      studentTeams: ids.studentTeams.length,
      studentTeamRecruitmentPosts: ids.studentTeamRecruitments.length,
      studentTeamRecruitmentApplications: ids.studentTeamRecruitmentApplications.length,
      activeReports: ids.activeReports.length,
      activeReportVersions: ids.activeReportVersions.length,
      activeArtifacts: ids.activeArtifacts.length,
      announcements: ids.announcements.length,
    };
  }, { timeout: 60_000 });

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
