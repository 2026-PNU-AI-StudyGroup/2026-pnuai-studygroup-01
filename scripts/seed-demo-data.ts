import "dotenv/config";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";

import { PrismaClient, UserRole } from "../src/generated/prisma/client";
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

function createDemoPdf() {
  const header = "%PDF-1.4\n";
  const stream = "BT /F1 18 Tf 72 720 Td (Approved final project report) Tj ET";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  const offsets: number[] = [];
  let body = header;
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body);
}

const demoReportPdf = createDemoPdf();
const demoReportSha256 = createHash("sha256").update(demoReportPdf).digest("hex");

const ids = {
  professors: [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000003",
  ],
  students: Array.from({ length: 8 }, (_, index) => `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  programs: Array.from({ length: 6 }, (_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  topics: Array.from({ length: 11 }, (_, index) => `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  applications: Array.from({ length: 16 }, (_, index) => `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  localViewerApplication: "61000000-0000-4000-8000-000000000001",
  teams: Array.from({ length: 7 }, (_, index) => `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  members: Array.from({ length: 10 }, (_, index) => `80000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  recruitments: Array.from({ length: 2 }, (_, index) => `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  recruitmentApplications: Array.from({ length: 2 }, (_, index) => `91000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  milestones: Array.from({ length: 7 }, (_, index) => `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  progress: Array.from({ length: 4 }, (_, index) => `b0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  discussions: Array.from({ length: 4 }, (_, index) => `c0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  artifacts: Array.from({ length: 10 }, (_, index) => `d0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  storedFiles: Array.from({ length: 5 }, (_, index) => `e0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reports: Array.from({ length: 5 }, (_, index) => `f0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  reportVersions: Array.from({ length: 5 }, (_, index) => `f1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
  approvalDecisions: Array.from({ length: 5 }, (_, index) => `f2000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
};
const demoReportObjectKeys = [2, 3, 4, 5, 6].map((teamIndex) => `demo/teams/${ids.teams[teamIndex]}/final-report.pdf`);
const demoReportUploadObjectKeys = demoReportObjectKeys.map((objectKey) => `staging/${objectKey}`);

async function seed() {
  await Promise.all(demoReportObjectKeys.map((objectKey) => s3.send(new PutObjectCommand({
    Bucket: objectStorageBucket,
    Key: objectKey,
    Body: demoReportPdf,
    ContentType: "application/pdf",
  }))));

  const seedResult = await prisma.$transaction(async (tx) => {
    await tx.artifact.deleteMany({ where: { id: { in: ids.artifacts } } });
    await tx.approvalDecision.deleteMany({ where: { id: { in: ids.approvalDecisions } } });
    await tx.reportVersion.deleteMany({ where: { id: { in: ids.reportVersions } } });
    await tx.report.deleteMany({ where: { id: { in: ids.reports } } });
    await tx.storedFile.deleteMany({ where: { id: { in: ids.storedFiles } } });
    await tx.recruitmentApplication.deleteMany({ where: { postId: { in: ids.recruitments } } });
    await tx.recruitmentPost.deleteMany({ where: { id: { in: ids.recruitments } } });
    await tx.teamMember.deleteMany({ where: { id: { in: ids.members } } });
    await tx.milestone.deleteMany({ where: { id: { in: ids.milestones } } });
    await tx.progressUpdate.deleteMany({ where: { id: { in: ids.progress } } });
    await tx.discussionPost.deleteMany({ where: { id: { in: ids.discussions } } });
    await tx.team.deleteMany({ where: { id: { in: ids.teams } } });
    await tx.topicApplication.deleteMany({ where: { id: { in: [...ids.applications, ids.localViewerApplication] } } });
    await tx.topic.deleteMany({ where: { id: { in: ids.topics } } });

    const people: Array<[string, string, string, UserRole]> = [
      [ids.professors[0], "김도윤 교수", "demo.professor1@pusan.ac.kr", UserRole.PROFESSOR],
      [ids.professors[1], "이서현 교수", "demo.professor2@pusan.ac.kr", UserRole.PROFESSOR],
      [ids.professors[2], "박준호 교수", "demo.professor3@pusan.ac.kr", UserRole.PROFESSOR],
      ...["정하늘", "윤서준", "최민지", "한지우", "오세진", "문가영", "임도현", "백소연"].map<[string, string, string, UserRole]>((name, index) => [
        ids.students[index], name, `demo.student${index + 1}@pusan.ac.kr`, UserRole.STUDENT,
      ]),
    ];
    for (const [id, name, email, role] of people) {
      await tx.user.upsert({
        where: { id },
        update: { name, email, emailVerified: true, role },
        create: { id, name, email, emailVerified: true, role },
      });
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
    const pastCycles = [await cycle(2025, "SECOND"), await cycle(2024, "SECOND"), await cycle(2023, "SECOND")];

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
      await program({ id: ids.programs[4], academicCycleId: pastCycles[1].id, name: "CSE 캡스톤 디자인 2024", category: "캡스톤", description: "2024학년도 캡스톤 디자인", startsAt: new Date("2024-03-01T00:00:00+09:00"), endsAt: new Date("2024-12-20T23:59:59+09:00"), status: "CLOSED" }),
      await program({ id: ids.programs[5], academicCycleId: pastCycles[2].id, name: "PNU 창의융합 해커톤 2023", category: "해커톤", description: "2023학년도 창의융합 해커톤", startsAt: new Date("2023-05-01T00:00:00+09:00"), endsAt: new Date("2023-11-30T23:59:59+09:00"), status: "CLOSED" }),
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
      await tx.topic.upsert({
        where: { id: ids.topics[index] },
        update: {
          academicCycleId: currentCycle.id, programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity,
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"), recruitmentEndsAt: new Date("2026-08-15T23:59:59+09:00"),
          executionStartsAt: new Date("2026-08-01T00:00:00+09:00"), executionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-12-15T23:59:59+09:00"),
          status: "PUBLISHED", publishedAt: new Date(`2026-06-${String(index + 10).padStart(2, "0")}T09:00:00+09:00`),
        },
        create: {
          id: ids.topics[index], academicCycleId: currentCycle.id, programId: activePrograms[programIndex].id, authorId: ids.professors[professorIndex],
          title, description, requiredSkills: [...requiredSkills], preferredSkills: [...preferredSkills], roleExpectations, availabilityRequirement, capacity,
          recruitmentStartsAt: new Date("2026-07-01T00:00:00+09:00"), recruitmentEndsAt: new Date("2026-08-15T23:59:59+09:00"),
          executionStartsAt: new Date("2026-08-01T00:00:00+09:00"), executionEndsAt: new Date("2026-11-30T23:59:59+09:00"),
          submissionStartsAt: new Date("2026-11-01T00:00:00+09:00"), submissionEndsAt: new Date("2026-12-15T23:59:59+09:00"),
          status: "PUBLISHED", publishedAt: new Date(`2026-06-${String(index + 10).padStart(2, "0")}T09:00:00+09:00`),
        },
      });
    }

    const pastTopics = [
      ["스마트 캠퍼스 내비게이션 앱", "건물 간 이동 시간과 무장애 경로를 함께 제공하는 교내 길찾기 서비스", ["Flutter", "PostGIS"], ["모바일 UX"], 0, 0],
      ["코드 리뷰 학습 분석 플랫폼", "리뷰 코멘트와 수정 이력을 분석해 반복되는 학습 주제를 보여 주는 협업 도구", ["Spring", "React"], ["텍스트 분석"], 0, 1],
      ["IoT 기반 강의실 공기질 모니터링", "센서 데이터를 수집해 환기 시점과 공간별 공기질 변화를 알리는 시스템", ["IoT", "Grafana"], ["임베디드"], 1, 2],
      ["시각장애 학생을 위한 강의자료 OCR", "강의자료의 표와 수식을 읽기 쉬운 구조로 변환하는 접근성 도구", ["Python", "OCR"], ["접근성"], 1, 0],
      ["교과목 선수관계 시각화", "교육과정의 선수 과목과 진로별 추천 이수 흐름을 탐색하는 웹 서비스", ["D3.js", "TypeScript"], ["정보 시각화"], 2, 1],
    ] as const;
    for (const [offset, data] of pastTopics.entries()) {
      const [title, description, requiredSkills, preferredSkills, programIndex, professorIndex] = data;
      const topicIndex = offset + 6;
      const targetCycle = pastCycles[programIndex];
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

    const acceptedApplicationRows = [
      [0, 0], [0, 1], [2, 2], [6, 0], [7, 1], [8, 2], [9, 3], [10, 4], [10, 5],
    ] as const;
    const reviewApplicationRows = [
      [1, 3, "PENDING", "시계열 데이터를 정리하고 예측 결과를 이해하기 쉬운 화면으로 표현해 보고 싶습니다."],
      [1, 4, "REJECTED", "Flutter 프로젝트 경험을 바탕으로 모바일에서도 혼잡도 정보를 빠르게 확인할 수 있게 만들겠습니다."],
      [3, 5, "PENDING", "공공 데이터를 안정적으로 정제하고 상황별 안내 문구의 정확성을 검증하겠습니다."],
      [4, 6, "REJECTED", "센서 수집 경험을 살려 행사 현장의 데이터 입력 과정을 단순하게 만들고 싶습니다."],
      [5, 7, "PENDING", "번역 결과의 차이를 한눈에 비교할 수 있는 정보 구조와 평가 화면을 설계하겠습니다."],
      [2, 3, "PENDING", "교수와 학생 인터뷰 결과를 바탕으로 지원부터 결과물 관리까지의 흐름을 다듬고 싶습니다."],
      [2, 4, "REJECTED", "반응형 인터페이스 구현과 접근성 점검을 맡아 실제 학과 구성원이 편하게 쓰는 화면을 만들겠습니다."],
    ] as const;
    await tx.topicApplication.createMany({ data: acceptedApplicationRows.map(([topicIndex, studentIndex], index) => {
      const createdAt = topicIndex < 6
        ? new Date("2026-07-05T12:00:00+09:00")
        : new Date(pastPrograms[pastTopics[topicIndex - 6][4]].startsAt.getTime() + 14 * 86_400_000);
      const decidedAt = new Date(createdAt.getTime() + 5 * 86_400_000);
      return {
      id: ids.applications[index], topicId: ids.topics[topicIndex], studentId: ids.students[studentIndex], message: "프로젝트 목표에 공감하며 맡은 역할을 끝까지 수행하겠습니다.",
      skills: topicIndex === 0 ? ["Next.js", "Figma"] : ["TypeScript", "Git"], desiredRole: "개발 및 사용자 검증", availability: "평일 저녁과 주말 가능",
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

    const teamRows = [
      [0, currentCycle.id, 0, "모두의 길", "CONFIRMED"],
      [2, currentCycle.id, 2, "프로젝트 모아", "FORMING"],
      [6, pastCycles[0].id, 0, "PNU Navi", "CLOSED"],
      [7, pastCycles[0].id, 1, "Review Loop", "CLOSED"],
      [8, pastCycles[1].id, 2, "AirClass", "CLOSED"],
      [9, pastCycles[1].id, 0, "SeeText", "CLOSED"],
      [10, pastCycles[2].id, 1, "Curriculum Map", "CLOSED"],
    ] as const;
    await tx.team.createMany({ data: teamRows.map(([topicIndex, academicCycleId, professorIndex, name, status], index) => ({
      id: ids.teams[index], academicCycleId, topicId: ids.topics[topicIndex], professorId: ids.professors[professorIndex], name, status,
    })) });
    await tx.teamMember.createMany({ data: acceptedApplicationRows.map(([topicIndex, studentIndex], index) => {
      const teamIndex = topicIndex === 0 ? 0 : topicIndex === 2 ? 1 : topicIndex - 4;
      return { id: ids.members[index], teamId: ids.teams[teamIndex], academicCycleId: teamRows[teamIndex][1], topicId: ids.topics[topicIndex], studentId: ids.students[studentIndex], applicationId: ids.applications[index] };
    }) });
    if (localViewer && localViewerApplicationId) {
      await tx.teamMember.create({ data: {
        id: ids.members[9],
        teamId: ids.teams[1],
        academicCycleId: currentCycle.id,
        topicId: ids.topics[2],
        studentId: localViewer.id,
        applicationId: localViewerApplicationId,
        joinedAt: new Date("2026-07-11T15:00:00+09:00"),
      } });
    }

    const closedTeamIndexes = [2, 3, 4, 5, 6] as const;
    const closedTeamSubmitters = [0, 1, 2, 3, 4] as const;
    for (const [reportIndex, teamIndex] of closedTeamIndexes.entries()) {
      const programIndex = teamIndex <= 3 ? 0 : teamIndex <= 5 ? 1 : 2;
      const submittedAt = new Date(pastPrograms[programIndex].endsAt.getTime() - 14 * 86_400_000);
      const objectKey = `demo/teams/${ids.teams[teamIndex]}/final-report.pdf`;
      await tx.storedFile.create({ data: {
        id: ids.storedFiles[reportIndex], teamId: ids.teams[teamIndex], ownerId: ids.students[closedTeamSubmitters[reportIndex]], purpose: "REPORT", status: "READY",
        objectKey, uploadObjectKey: `staging/${objectKey}`, originalName: `${teamRows[teamIndex][3]}-결과보고서.pdf`, contentType: "application/pdf", size: demoReportPdf.byteLength,
        sha256: demoReportSha256, expiresAt: submittedAt, cleanupAfter: new Date("2099-12-31T00:00:00+09:00"), readyAt: submittedAt, createdAt: submittedAt,
      } });
      await tx.report.create({ data: { id: ids.reports[reportIndex], teamId: ids.teams[teamIndex], type: "FINAL", createdAt: submittedAt } });
      await tx.reportVersion.create({ data: {
        id: ids.reportVersions[reportIndex], reportId: ids.reports[reportIndex], version: 1, fileId: ids.storedFiles[reportIndex],
        submitterId: ids.students[closedTeamSubmitters[reportIndex]], description: "최종 검토 의견을 반영한 결과 보고서", submittedAt,
      } });
      await tx.approvalDecision.create({ data: {
        id: ids.approvalDecisions[reportIndex], reportVersionId: ids.reportVersions[reportIndex], reviewerId: ids.professors[teamRows[teamIndex][2]],
        decision: "APPROVED", comment: "최종 결과와 수행 과정 확인 완료", decidedAt: new Date(submittedAt.getTime() + 5 * 86_400_000),
      } });
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
        content: "주제 지원, 팀 진행 기록, 보고서 승인과 결과물 공개가 끊기지 않도록 데이터 모델과 서버 로직을 함께 설계합니다.", requiredSkills: ["TypeScript", "PostgreSQL"],
        roleNeeded: "백엔드 개발과 테스트 자동화", availability: "주 1회 온라인 회의, 비동기 코드 리뷰", status: "OPEN",
        createdAt: new Date("2026-07-14T20:00:00+09:00"),
      },
    ] });
    await tx.recruitmentApplication.createMany({ data: [
      {
        id: ids.recruitmentApplications[0],
        postId: ids.recruitments[0],
        topicApplicationId: ids.applications[14],
        studentId: ids.students[3],
        status: "PENDING",
        createdAt: new Date("2026-07-15T21:00:00+09:00"),
      },
      {
        id: ids.recruitmentApplications[1],
        postId: ids.recruitments[1],
        topicApplicationId: ids.applications[15],
        studentId: ids.students[4],
        status: "REJECTED",
        createdAt: new Date("2026-07-15T22:30:00+09:00"),
        decidedAt: new Date("2026-07-16T19:00:00+09:00"),
      },
    ] });
    await tx.milestone.createMany({ data: [
      { id: ids.milestones[0], teamId: ids.teams[0], createdById: ids.students[0], title: "교내 접근성 경로 현장 조사", dueAt: new Date("2026-07-25T18:00:00+09:00"), status: "DONE" },
      { id: ids.milestones[1], teamId: ids.teams[0], createdById: ids.students[0], title: "길찾기 프로토타입 사용성 테스트", dueAt: new Date("2026-08-20T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.milestones[2], teamId: ids.teams[0], createdById: ids.students[1], title: "학내 지도 데이터 정합성 검증", dueAt: new Date("2026-09-10T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[3], teamId: ids.teams[1], createdById: ids.students[2], title: "교수·학생 인터뷰 5건 완료", dueAt: new Date("2026-08-05T18:00:00+09:00"), status: "IN_PROGRESS" },
      { id: ids.milestones[4], teamId: ids.teams[1], createdById: ids.students[2], title: "핵심 사용자 흐름 와이어프레임 검증", dueAt: new Date("2026-08-12T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[5], teamId: ids.teams[1], createdById: ids.students[2], title: "프로젝트 탐색 화면 반응형 구현", dueAt: new Date("2026-08-26T18:00:00+09:00"), status: "TODO" },
      { id: ids.milestones[6], teamId: ids.teams[1], createdById: ids.students[2], title: "지원·승인 통합 시나리오 테스트", dueAt: new Date("2026-09-09T18:00:00+09:00"), status: "TODO" },
    ] });
    await tx.progressUpdate.createMany({ data: [
      { id: ids.progress[0], teamId: ids.teams[0], authorId: ids.students[0], content: "제1공학관과 중앙도서관의 무장애 출입구 18곳을 확인했습니다.", risk: "일부 엘리베이터 운행 시간 데이터가 공개되어 있지 않습니다.", nextAction: "시설과에 운영 시간 확인 요청", createdAt: new Date("2026-07-16T20:00:00+09:00") },
      { id: ids.progress[1], teamId: ids.teams[1], authorId: ids.students[2], content: "학생 3명과 지도교수 2명의 인터뷰를 정리하고 프로젝트 탐색 단계의 공통 불편 7가지를 도출했습니다.", risk: "교수와 학생이 같은 용어를 서로 다르게 이해하는 항목이 있습니다.", nextAction: "주제·프로그램·프로젝트 용어 정의 검토", createdAt: new Date("2026-07-13T21:00:00+09:00") },
      { id: ids.progress[2], teamId: ids.teams[1], authorId: ids.students[2], content: "주제 탐색과 지난 프로젝트를 한 화면에서 전환하는 프로토타입을 완성했습니다.", risk: "모바일에서 필터 항목이 길어질 때 탐색 흐름이 끊길 수 있습니다.", nextAction: "모바일 필터 사용성 테스트 3건 진행", createdAt: new Date("2026-07-15T22:00:00+09:00") },
      { id: ids.progress[3], teamId: ids.teams[1], authorId: recruitmentAuthorId, content: "프로젝트 프로필 정보를 지원서에 자동 반영하고 수정 가능한 흐름까지 연결했습니다.", risk: "프로필이 비어 있는 신규 사용자의 첫 지원 경험을 추가로 확인해야 합니다.", nextAction: "신규 사용자 빈 상태와 오류 문구 점검", createdAt: new Date("2026-07-17T00:30:00+09:00") },
    ] });
    await tx.discussionPost.createMany({ data: [
      { id: ids.discussions[0], teamId: ids.teams[0], authorId: ids.professors[0], content: "경로 정확도보다 접근 불가능한 구간을 명확히 설명하는 것을 우선해 주세요.", createdAt: new Date("2026-07-17T10:00:00+09:00") },
      { id: ids.discussions[1], teamId: ids.teams[1], authorId: ids.professors[2], content: "기능 목록보다 학생이 처음 들어와 주제를 찾고 팀에 합류하는 순서를 먼저 검증해 주세요.", createdAt: new Date("2026-07-14T10:00:00+09:00") },
      { id: ids.discussions[2], teamId: ids.teams[1], authorId: ids.students[2], content: "이번 주에는 프로그램을 별도 메뉴로 분리하지 않고 주제 필터로 이해되는지 확인하겠습니다.", createdAt: new Date("2026-07-15T13:30:00+09:00") },
      { id: ids.discussions[3], teamId: ids.teams[1], authorId: ids.professors[2], content: "지난 프로젝트의 결과물까지 같은 탐색 맥락에서 이어지는지 사용자 테스트 항목에 포함해 주세요.", createdAt: new Date("2026-07-16T11:00:00+09:00") },
    ] });

    const artifactRows = [
      [2, "SOURCE_CODE", "PNU Navi 소스 코드", "https://github.com/pusan-cse-demo/pnu-navi"], [2, "PRESENTATION_VIDEO", "최종 발표 영상", "https://www.youtube.com/"],
      [3, "SOURCE_CODE", "Review Loop 저장소", "https://github.com/pusan-cse-demo/review-loop"], [3, "POSTER", "학습 분석 포스터", "https://example.com/pusan-demo/review-loop-poster"],
      [4, "SOURCE_CODE", "AirClass 펌웨어와 서버", "https://github.com/pusan-cse-demo/air-class"], [4, "OTHER", "공기질 데이터 설명서", "https://example.com/pusan-demo/air-class-data"],
      [5, "SOURCE_CODE", "SeeText 소스 코드", "https://github.com/pusan-cse-demo/see-text"], [5, "PRESENTATION_VIDEO", "접근성 사용자 테스트", "https://www.youtube.com/"],
      [6, "SOURCE_CODE", "Curriculum Map 저장소", "https://github.com/pusan-cse-demo/curriculum-map"], [6, "POSTER", "교육과정 시각화 포스터", "https://example.com/pusan-demo/curriculum-map-poster"],
    ] as const;
    const artifactRegistrants = [0, 0, 1, 1, 2, 2, 3, 3, 4, 5] as const;
    await tx.artifact.createMany({ data: artifactRows.map(([teamIndex, type, title, externalUrl], index) => ({ id: ids.artifacts[index], teamId: ids.teams[teamIndex], registeredById: ids.students[artifactRegistrants[index]], type, title, externalUrl })) });
    await tx.objectDeletionJob.deleteMany({
      where: { objectKey: { in: [...demoReportObjectKeys, ...demoReportUploadObjectKeys] } },
    });
    return {
      localViewer: localViewer ? { name: localViewer.name, email: localViewer.email } : null,
      connectedToDemoProject: Boolean(localViewerApplicationId),
    };
  });

  console.log(JSON.stringify({
    activePrograms: 3,
    activeTopics: 6,
    activeTeams: 2,
    topicApplications: 16 + (seedResult.localViewer ? 1 : 0),
    recruitmentPosts: 2,
    recruitmentApplications: 2,
    archivedProjects: 5,
    approvedFinalReports: 5,
    artifacts: 10,
    localViewer: seedResult.localViewer ? { ...seedResult.localViewer, connectedToDemoProject: seedResult.connectedToDemoProject } : null,
  }));
}

seed()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
