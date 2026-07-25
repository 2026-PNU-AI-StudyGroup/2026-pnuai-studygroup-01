import "dotenv/config";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

import { Prisma, PrismaClient, UserRole } from "../src/generated/prisma/client";
import { objectStorageBucket, s3 } from "../src/shared/infrastructure/object-storage/s3";

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

const demoProjectDocuments = [
  ["PNU Navi", "스마트 캠퍼스 내비게이션 앱", "무장애 경로와 건물 간 이동 시간을 함께 안내하는 모바일 서비스", "POSTER", "사용자 검증 포스터"],
  ["Review Loop", "코드 리뷰 학습 분석 플랫폼", "리뷰 이력에서 반복 학습 주제를 찾는 협업 도구", "OTHER", "서비스 설계 및 평가 자료"],
  ["Re:cup", "축제 다회용기 반납 동선 최적화", "대여와 반납 기록을 바탕으로 수거 지점을 제안하는 분석 도구", "POSTER", "축제 운영 결과 포스터"],
  ["AirClass", "IoT 기반 강의실 공기질 모니터링", "센서 데이터로 환기 시점과 공간별 공기질을 알리는 시스템", "OTHER", "센서 검증 결과 보고서"],
  ["SeeText", "시각장애 학생을 위한 강의자료 OCR", "표와 수식을 읽기 쉬운 구조로 변환하는 접근성 도구", "POSTER", "접근성 사용성 평가 포스터"],
  ["TermBridge", "전공 용어 한영 병렬 말뭉치 검수 도구", "번역 누락과 전공 용어 불일치를 검토하는 품질 도구", "OTHER", "번역 품질 평가 자료"],
  ["Curriculum Map", "교과목 선수관계 시각화", "선수 과목과 진로별 추천 이수 흐름을 탐색하는 웹 서비스", "POSTER", "교육과정 시각화 포스터"],
  ["LabLink", "실험실 장비 예약 충돌 방지 서비스", "공용 장비 예약과 사용 이력을 연결하는 관리 서비스", "OTHER", "도메인 설계 결과 보고서"],
  ["Roadmap", "신입생 수강 계획 도우미", "관심 진로와 이수 현황에 맞춘 수강 계획 비교 서비스", "POSTER", "신입생 사용성 평가 포스터"],
  ["Degree Check", "졸업 요건 점검 자동화", "남은 전공과 교양 요건을 설명하는 규칙 기반 도구", "OTHER", "규칙 검증 결과 보고서"],
  ["FindIt", "학내 분실물 이미지 검색", "사진과 설명으로 유사한 습득물 후보를 찾는 검색 서비스", "POSTER", "검색 성능 평가 포스터"],
  ["First Commit", "오픈소스 기여 시작 안내서", "첫 이슈 선택부터 풀 리퀘스트까지 안내하는 저장소 탐색 도구", "OTHER", "오픈소스 기여 안내 자료"],
] as const;
const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  professors: [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000003",
  ],
  students: Array.from({ length: 12 }, (_, index) => `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  programs: Array.from({ length: 11 }, (_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  topics: Array.from({ length: 18 }, (_, index) => `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  applications: Array.from({ length: 64 }, (_, index) => `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  localViewerApplication: "61000000-0000-4000-8000-000000000001",
  teams: Array.from({ length: 14 }, (_, index) => `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  members: Array.from({ length: 64 }, (_, index) => `80000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  recruitments: Array.from({ length: 2 }, (_, index) => `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  recruitmentApplications: Array.from({ length: 2 }, (_, index) => `91000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  milestones: Array.from({ length: 7 }, (_, index) => `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  discussions: Array.from({ length: 4 }, (_, index) => `c0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  artifacts: Array.from({ length: 12 }, (_, index) => `d0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  storedFiles: Array.from({ length: 24 }, (_, index) => `e0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reports: Array.from({ length: 12 }, (_, index) => `f0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reportVersions: Array.from({ length: 12 }, (_, index) => `f1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  approvalDecisions: Array.from({ length: 12 }, (_, index) => `f2000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
};
const closedTeamIndexes = Array.from({ length: 12 }, (_, index) => index + 2);
const demoReportObjectKeys = closedTeamIndexes.map((teamIndex) => `demo/teams/${ids.teams[teamIndex]}/final-report.pdf`);
const demoArtifactObjectKeys = closedTeamIndexes.map((teamIndex) => `demo/teams/${ids.teams[teamIndex]}/published-result.pdf`);
const demoObjectKeys = [...demoReportObjectKeys, ...demoArtifactObjectKeys];
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
  await Promise.all([
    ...demoReportObjectKeys.map((objectKey, index) => s3.send(new PutObjectCommand({ Bucket: objectStorageBucket, Key: objectKey, Body: demoReportPdfs[index], ContentType: "application/pdf" }))),
    ...demoArtifactObjectKeys.map((objectKey, index) => s3.send(new PutObjectCommand({ Bucket: objectStorageBucket, Key: objectKey, Body: demoArtifactPdfs[index], ContentType: "application/pdf" }))),
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
      { actorId: { in: [ids.admin, ...ids.professors] } },
      { targetId: { in: [...ids.teams, ...ids.reportVersions, ...ids.professors.map((_, index) => `demo.professor${index + 1}@pusan.ac.kr`)] } },
    ] } });
    await tx.artifact.deleteMany({ where: { id: { in: ids.artifacts } } });
    await tx.approvalDecision.deleteMany({ where: { id: { in: ids.approvalDecisions } } });
    await tx.reportVersion.deleteMany({ where: { id: { in: ids.reportVersions } } });
    await tx.report.deleteMany({ where: { id: { in: ids.reports } } });
    await tx.storedFile.deleteMany({ where: { id: { in: ids.storedFiles } } });
    await tx.recruitmentApplication.deleteMany({ where: { postId: { in: ids.recruitments } } });
    await tx.recruitmentPost.deleteMany({ where: { id: { in: ids.recruitments } } });
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
      ...["정하늘", "윤서준", "최민지", "한지우", "오세진", "문가영", "임도현", "백소연", "강민재", "서유진", "조현우", "신예린"].map<[string, string, string, UserRole]>((name, index) => [
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
    for (const [index] of ids.professors.entries()) {
      const email = `demo.professor${index + 1}@pusan.ac.kr`;
      await tx.professorAllowlist.upsert({
        where: { email },
        update: { createdById: ids.admin, revokedAt: null },
        create: { email, createdById: ids.admin, createdAt: new Date(`2026-02-${String(10 + index).padStart(2, "0")}T10:00:00+09:00`) },
      });
      await tx.auditLog.create({ data: {
        actorId: ids.admin,
        action: "PROFESSOR_ACCESS_GRANTED",
        targetType: "PUSAN_EMAIL",
        targetId: email,
        metadata: {},
        createdAt: new Date(`2026-02-${String(10 + index).padStart(2, "0")}T10:00:00+09:00`),
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
    const studentProfiles = [
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
      await program({ id: ids.programs[0], academicCycleId: currentCycle.id, name: "CSE 캡스톤 디자인 2026", category: "캡스톤", description: "전공 지식을 바탕으로 실제 문제를 해결하는 1년 과정의 팀 프로젝트", startsAt: new Date("2026-03-01T00:00:00+09:00"), endsAt: new Date("2026-12-20T23:59:59+09:00"), status: "OPEN" }),
      await program({ id: ids.programs[1], academicCycleId: currentCycle.id, name: "PNU 창의융합 해커톤 2026", category: "해커톤", description: "학과 간 협업으로 캠퍼스 문제의 작동하는 프로토타입을 만드는 프로그램", startsAt: new Date("2026-05-01T00:00:00+09:00"), endsAt: new Date("2026-10-31T23:59:59+09:00"), status: "OPEN" }),
      await program({ id: ids.programs[2], academicCycleId: currentCycle.id, name: "PNU AI 부스터 2026", category: "교육 프로그램", description: "로컬 AI 도구를 활용한 문제 정의와 제품 구현 역량 강화 프로그램", startsAt: new Date("2026-04-01T00:00:00+09:00"), endsAt: new Date("2026-11-30T23:59:59+09:00"), status: "OPEN" }),
    ];
    const pastPrograms = [
      await program({ id: ids.programs[3], academicCycleId: pastCycles[0].id, name: "CSE 캡스톤 디자인 2025", category: "캡스톤", description: "2025학년도 캡스톤 디자인", startsAt: new Date("2025-03-01T00:00:00+09:00"), endsAt: new Date("2025-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[4], academicCycleId: pastCycles[0].id, name: "PNU 창의융합 해커톤 2025", category: "해커톤", description: "지역과 캠퍼스의 문제를 해결한 2025학년도 창의융합 해커톤", startsAt: new Date("2025-05-01T00:00:00+09:00"), endsAt: new Date("2025-10-31T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[5], academicCycleId: pastCycles[1].id, name: "CSE 캡스톤 디자인 2024", category: "캡스톤", description: "2024학년도 캡스톤 디자인", startsAt: new Date("2024-03-01T00:00:00+09:00"), endsAt: new Date("2024-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[6], academicCycleId: pastCycles[1].id, name: "PNU AI 부스터 2024", category: "교육 프로그램", description: "AI 활용 문제 해결 역량을 다룬 2024학년도 교육 프로그램", startsAt: new Date("2024-04-01T00:00:00+09:00"), endsAt: new Date("2024-11-30T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[7], academicCycleId: pastCycles[2].id, name: "CSE 캡스톤 디자인 2023", category: "캡스톤", description: "2023학년도 캡스톤 디자인", startsAt: new Date("2023-03-01T00:00:00+09:00"), endsAt: new Date("2023-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[8], academicCycleId: pastCycles[2].id, name: "카카오 테크 캠퍼스 1기", category: "산학 프로그램", description: "실무형 웹 서비스 개발을 수행한 산학 협력 프로그램", startsAt: new Date("2023-04-01T00:00:00+09:00"), endsAt: new Date("2023-11-30T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[9], academicCycleId: pastCycles[3].id, name: "CSE 캡스톤 디자인 2022", category: "캡스톤", description: "2022학년도 캡스톤 디자인", startsAt: new Date("2022-03-01T00:00:00+09:00"), endsAt: new Date("2022-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[10], academicCycleId: pastCycles[3].id, name: "PNU 오픈소스 SW 경진대회 2022", category: "경진대회", description: "오픈소스 기반 제품 개발과 공개 기여를 다룬 교내 경진대회", startsAt: new Date("2022-05-01T00:00:00+09:00"), endsAt: new Date("2022-11-30T23:59:59+09:00"), status: "CLOSED" }),
    ];

    const activeTopics = [
      ["캠퍼스 이동약자를 위한 실내 길찾기", "강의동 내부의 경사로, 엘리베이터, 자동문 정보를 반영해 휠체어 사용자가 접근 가능한 경로를 안내합니다.", ["Next.js", "PostgreSQL", "PostGIS"], ["접근성", "지도 UI"], "프론트엔드 또는 공간 데이터 담당", "주 1회 대면 회의와 주 4시간 이상 개발", 4, 0, 0],
      ["강의실 혼잡도 예측 및 알림", "시간표와 익명 센서 데이터를 결합해 학습 공간의 혼잡도를 예측하고 한산한 공간을 추천합니다.", ["TypeScript", "Python"], ["시계열 분석", "데이터 시각화"], "데이터 분석 또는 웹 개발 담당", "화요일 저녁 정기 회의 참여", 4, 0, 1],
      ["학과 프로젝트 운영 기록 자동화", "마일스톤, 보고서 승인, 결과물을 한 흐름으로 연결해 캡스톤 운영 과정의 누락을 줄입니다.", ["Next.js", "Prisma"], ["UX 리서치", "테스트 자동화"], "제품 설계 또는 풀스택 개발 담당", "주 2회 온라인 진행 공유", 5, 0, 2],
      ["재난 문자 기반 교내 대피 경로 안내", "공공 재난 문자와 교내 건물 정보를 연결해 상황별 대피 행동을 빠르게 확인하는 모바일 웹을 구현합니다.", ["React", "공공데이터 API"], ["PWA", "지도"], "모바일 웹 또는 데이터 연동 담당", "해커톤 주간 집중 참여 가능", 4, 1, 0],
      ["학생회 행사 수요 예측", "이전 행사 신청과 날씨 데이터를 이용해 준비 물품과 공간 규모를 합리적으로 산정합니다.", ["Python", "SQL"], ["통계", "대시보드"], "데이터 분석 또는 서비스 기획 담당", "격주 목요일 회의", 3, 1, 1],
      ["논문 초록 한영 번역 품질 비교 도구", "로컬 LLM 번역 결과를 용어 일관성, 누락, 문장 가독성 기준으로 비교하는 검토 도구를 만듭니다.", ["TypeScript", "Ollama"], ["NLP", "평가 설계"], "번역 평가 또는 웹 개발 담당", "주 1회 온라인 회의", 4, 2, 2],
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
          academicCycleId: currentCycle.id, programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity, applicationMode,
          ...schedule,
          status: "PUBLISHED", publishedAt: new Date(`2026-06-${String(index + 10).padStart(2, "0")}T09:00:00+09:00`),
        },
        create: {
          id: ids.topics[index], academicCycleId: currentCycle.id, programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity, applicationMode,
          applicationQuestions: { create: applicationQuestions },
          ...schedule,
          status: "PUBLISHED", publishedAt: new Date(`2026-06-${String(index + 10).padStart(2, "0")}T09:00:00+09:00`),
        },
      });
    }

    const pastTopics = [
      ["스마트 캠퍼스 내비게이션 앱", "건물 간 이동 시간과 무장애 경로를 함께 제공하는 교내 길찾기 서비스", ["Flutter", "PostGIS"], ["모바일 UX"], 0, 0, 0],
      ["코드 리뷰 학습 분석 플랫폼", "리뷰 코멘트와 수정 이력을 분석해 반복되는 학습 주제를 보여 주는 협업 도구", ["Spring", "React"], ["텍스트 분석"], 0, 0, 1],
      ["축제 다회용기 반납 동선 최적화", "교내 축제의 대여·반납 기록을 분석해 대기 시간을 줄이는 수거 지점 배치 도구", ["Python", "React"], ["최적화"], 0, 1, 2],
      ["IoT 기반 강의실 공기질 모니터링", "센서 데이터를 수집해 환기 시점과 공간별 공기질 변화를 알리는 시스템", ["IoT", "Grafana"], ["임베디드"], 1, 2, 2],
      ["시각장애 학생을 위한 강의자료 OCR", "강의자료의 표와 수식을 읽기 쉬운 구조로 변환하는 접근성 도구", ["Python", "OCR"], ["접근성"], 1, 2, 0],
      ["전공 용어 한영 병렬 말뭉치 검수 도구", "학과 강의자료에서 구축한 병렬 문장의 번역 누락과 용어 불일치를 검토하는 도구", ["Python", "NLP"], ["번역 평가"], 1, 3, 1],
      ["교과목 선수관계 시각화", "교육과정의 선수 과목과 진로별 추천 이수 흐름을 탐색하는 웹 서비스", ["D3.js", "TypeScript"], ["정보 시각화"], 2, 4, 1],
      ["실험실 장비 예약 충돌 방지 서비스", "공용 장비의 예약, 승인과 사용 이력을 연결해 중복 예약과 미반납을 줄이는 웹 서비스", ["Spring", "PostgreSQL"], ["도메인 모델링"], 2, 4, 0],
      ["신입생 수강 계획 도우미", "관심 진로와 이수 현황을 바탕으로 다음 학기 수강 계획을 비교하는 서비스", ["React", "Kotlin"], ["추천 UX"], 2, 5, 2],
      ["졸업 요건 점검 자동화", "학생별 이수 내역에서 전공·교양·졸업 요건의 충족 여부와 남은 항목을 설명하는 도구", ["Java", "PostgreSQL"], ["규칙 엔진"], 3, 6, 0],
      ["학내 분실물 이미지 검색", "분실물 사진과 설명을 함께 검색해 유사한 습득물 후보를 빠르게 찾는 서비스", ["Python", "OpenCV"], ["검색"], 3, 6, 1],
      ["오픈소스 기여 시작 안내서", "초보 기여자가 이슈 선택부터 첫 풀 리퀘스트까지 따라갈 수 있는 저장소 탐색 도구", ["TypeScript", "GitHub API"], ["오픈소스"], 3, 7, 2],
    ] as const;
    for (const [offset, data] of pastTopics.entries()) {
      const [title, description, requiredSkills, preferredSkills, cycleIndex, programIndex, professorIndex] = data;
      const topicIndex = offset + 6;
      const targetCycle = pastCycles[cycleIndex];
      const targetProgram = pastPrograms[programIndex];
      await tx.topic.upsert({
        where: { id: ids.topics[topicIndex] },
        update: {
          academicCycleId: targetCycle.id, programId: targetProgram.id, authorId: ids.professors[professorIndex], title, description,
          requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations: "팀 역할 분담 완료", availabilityRequirement: "프로젝트 종료",
          capacity: 4, recruitmentStartsAt: targetProgram.startsAt, recruitmentEndsAt: new Date(targetProgram.startsAt.getTime() + 60 * 86_400_000),
          executionStartsAt: new Date(targetProgram.startsAt.getTime() + 30 * 86_400_000), executionEndsAt: new Date(targetProgram.endsAt.getTime() - 30 * 86_400_000),
          submissionStartsAt: new Date(targetProgram.endsAt.getTime() - 60 * 86_400_000), submissionEndsAt: targetProgram.endsAt,
          status: "CLOSED", publishedAt: targetProgram.startsAt,
        },
        create: {
          id: ids.topics[topicIndex], academicCycleId: targetCycle.id, programId: targetProgram.id, authorId: ids.professors[professorIndex], title, description,
          requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations: "팀 역할 분담 완료", availabilityRequirement: "프로젝트 종료",
          capacity: 4, recruitmentStartsAt: targetProgram.startsAt, recruitmentEndsAt: new Date(targetProgram.startsAt.getTime() + 60 * 86_400_000),
          executionStartsAt: new Date(targetProgram.startsAt.getTime() + 30 * 86_400_000), executionEndsAt: new Date(targetProgram.endsAt.getTime() - 30 * 86_400_000),
          submissionStartsAt: new Date(targetProgram.endsAt.getTime() - 60 * 86_400_000), submissionEndsAt: targetProgram.endsAt,
          status: "CLOSED", publishedAt: targetProgram.startsAt,
        },
      });
    }

    const pastAcceptedApplicationRows = pastTopics.flatMap((_, offset) => {
      const firstStudentIndex = (offset % 3) * 4;
      return Array.from({ length: 4 }, (__, memberOffset) => [offset + 6, firstStudentIndex + memberOffset] as const);
    });
    const acceptedApplicationRows: Array<readonly [number, number]> = [
      // 2026년 진행 팀. 모두의 길은 정원 마감, 프로젝트 모아는 추가 모집 중이다.
      [0, 0], [0, 1], [0, 3], [0, 4], [2, 2],
      // 과거 학년도마다 학생은 한 팀에만 속하고, 다음 학년도에는 새 팀으로 참여할 수 있다.
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
    const teamRows: Array<readonly [number, string, number, string, "FORMING" | "CONFIRMED" | "CLOSED"]> = [
      [0, currentCycle.id, 0, "모두의 길", "CONFIRMED"],
      [2, currentCycle.id, 2, "프로젝트 모아", "FORMING"],
      ...pastTopics.map((topic, offset) => [offset + 6, pastCycles[topic[4]].id, topic[6], pastTeamNames[offset], "CLOSED"] as const),
    ];
    await tx.team.createMany({ data: teamRows.map(([topicIndex, academicCycleId, professorIndex, name, status], index) => ({
      id: ids.teams[index], academicCycleId, topicId: ids.topics[topicIndex], professorId: ids.professors[professorIndex], name, status,
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

    for (const [reportIndex, teamIndex] of closedTeamIndexes.entries()) {
      const topicIndex = teamRows[teamIndex][0];
      const programIndex = pastTopics[topicIndex - 6][5];
      const submitterIndex = (reportIndex % 3) * 4;
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
        id: ids.approvalDecisions[reportIndex], reportVersionId: ids.reportVersions[reportIndex], reviewerId: ids.professors[teamRows[teamIndex][2]],
        decision: "APPROVED", comment: "최종 결과와 수행 과정 확인 완료", decidedAt: approvedAt,
      } });
      await tx.auditLog.createMany({ data: [
        {
          actorId: ids.professors[teamRows[teamIndex][2]], action: "REPORT_APPROVED", targetType: "REPORT_VERSION",
          targetId: ids.reportVersions[reportIndex], metadata: { teamId: ids.teams[teamIndex], reportType: "FINAL", version: 1 }, createdAt: approvedAt,
        },
        {
          actorId: ids.professors[teamRows[teamIndex][2]], action: "TEAM_CLOSED", targetType: "TEAM",
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
    await tx.milestone.createMany({ data: [
      { id: ids.milestones[0], teamId: ids.teams[0], createdById: ids.students[0], title: "교내 접근성 경로 현장 조사", dueAt: new Date("2026-07-25T18:00:00+09:00"), status: "DONE" },
      { id: ids.milestones[1], teamId: ids.teams[0], createdById: ids.students[0], title: "길찾기 프로토타입 사용성 테스트", dueAt: new Date("2026-08-20T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.milestones[2], teamId: ids.teams[0], createdById: ids.students[1], title: "학내 지도 데이터 정합성 검증", dueAt: new Date("2026-09-10T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[3], teamId: ids.teams[1], createdById: ids.students[2], title: "교수·학생 인터뷰 5건 완료", dueAt: new Date("2026-07-22T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.milestones[4], teamId: ids.teams[1], createdById: ids.students[2], title: "핵심 사용자 흐름 와이어프레임 검증", dueAt: new Date("2026-08-12T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[5], teamId: ids.teams[1], createdById: ids.students[2], title: "프로젝트 탐색 화면 반응형 구현", dueAt: new Date("2026-08-26T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[6], teamId: ids.teams[1], createdById: ids.students[2], title: "지원·승인 통합 시나리오 테스트", dueAt: new Date("2026-09-09T18:00:00+09:00"), status: "TODO" },
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

    for (const [index, teamIndex] of closedTeamIndexes.entries()) {
      const ownerId = ids.students[(index % 3) * 4];
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
    };
  });

  console.log(JSON.stringify({
    activePrograms: 3,
    activeTopics: 6,
    activeTeams: 2,
    topicApplications: seedResult.topicApplications,
    recruitmentPosts: 2,
    recruitmentApplications: 2,
    notifications: seedResult.connectedToDemoProject ? 4 : 0,
    archivedProjects: 12,
    approvedFinalReports: 12,
    artifacts: 12,
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
