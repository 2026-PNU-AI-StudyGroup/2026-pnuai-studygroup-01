import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  AnnouncementVisibility,
  PrismaClient,
} from "../src/generated/prisma/client";
import {
  buildDemoProgramAnnouncements,
  LEGACY_PROGRAM_ANNOUNCEMENT_IDS,
} from "./demo-program-announcements";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
if (process.env.ALLOW_LOCAL_DEMO_SEED !== "true") {
  throw new Error("ALLOW_LOCAL_DEMO_SEED=true으로 명시적으로 허용한 환경에서만 실행할 수 있습니다.");
}

const databaseUrl = new URL(connectionString);
const isLocalDatabase = ["127.0.0.1", "localhost"].includes(databaseUrl.hostname);
const isDevelopmentComposeDatabase = process.env.ENABLE_DEVELOPMENT_MOCK_AUTH === "true"
  && databaseUrl.hostname === "postgres";
if (!isLocalDatabase && !isDevelopmentComposeDatabase) {
  throw new Error("프로그램 데모 공지는 로컬 DB 또는 목 인증 Compose DB에만 생성할 수 있습니다.");
}

const programIds = Array.from(
  { length: 11 },
  (_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const adminId = "00000000-0000-4000-8000-000000000001";
const professorIds = Array.from(
  { length: 3 },
  (_, index) => `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedDemoProgramAnnouncements() {
  const programs = await prisma.projectProgram.findMany({
    where: { id: { in: programIds } },
    select: {
      id: true,
      name: true,
      startsAt: true,
      endsAt: true,
      recruitmentStartsAt: true,
      recruitmentEndsAt: true,
      executionStartsAt: true,
      executionEndsAt: true,
    },
  });
  const programById = new Map(programs.map((program) => [program.id, program]));
  const orderedPrograms = programIds.map((id) => {
    const program = programById.get(id);
    if (!program) throw new Error(`데모 프로그램을 찾을 수 없습니다: ${id}`);
    return program;
  });
  const rows = orderedPrograms.flatMap((program, programIndex) => {
    return buildDemoProgramAnnouncements(program, programIndex).map((announcement, announcementIndex) => ({
      ...announcement,
      authorId: announcementIndex % 2 === 0
        ? adminId
        : professorIds[programIndex % professorIds.length],
      programId: program.id,
      projectTeamId: null,
      visibility: announcement.visibility === "TARGET_MEMBERS"
        ? AnnouncementVisibility.TARGET_MEMBERS
        : AnnouncementVisibility.AUTHENTICATED,
      updatedAt: announcement.createdAt,
    }));
  });

  await prisma.$transaction(async (tx) => {
    await tx.announcement.deleteMany({
      where: {
        OR: [
          { id: { startsWith: "a2000000-0000-4000-8000-" } },
          { id: { in: LEGACY_PROGRAM_ANNOUNCEMENT_IDS } },
        ],
      },
    });
    await tx.announcement.createMany({ data: rows });
  });

  console.log(JSON.stringify({
    total: rows.length,
    programs: orderedPrograms.map((program) => ({
      id: program.id,
      name: program.name,
      announcements: rows.filter((row) => row.programId === program.id).length,
    })),
  }, null, 2));
}

seedDemoProgramAnnouncements()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
