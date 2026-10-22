import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { normalizeRepoUrl, stableArchiveId, type SnapshotProgram } from "./github-archive";

// scripts/github-archive/snapshot.json 을 지난 프로그램과 프로젝트로 넣는다.
// OPUS 이관(import-opus-archive.ts)과 같은 방식이다. 모든 ID 를 저장소 이름에서 유도해
// 몇 번을 돌려도 같은 행이 갱신될 뿐 늘지 않는다. 팀원 계정과 사진은 넣지 않는다.
// 운영 실행: docker compose -f compose.production.yaml --env-file .env.production run --rm import-github

const here = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
if (!process.argv.includes("--confirm")) {
  throw new Error("실제 데이터를 씁니다. --confirm 을 붙여 실행하세요.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const ARCHIVE_USER_ID = "github-archive-importer";
const ARCHIVE_USER_EMAIL = "github-archive@aipms.pusan.ac.kr";

// artifact 는 BEFORE INSERT 트리거가 붙어 있다. prisma upsert 는 INSERT ... ON CONFLICT 라
// 이미 있는 행에도 INSERT 트리거가 먼저 돌아 실패한다. OPUS 이관과 같이 갈라 보낸다.
async function ensureArtifact(id: string, data: Prisma.ArtifactUncheckedCreateInput): Promise<void> {
  const existing = await prisma.artifact.findUnique({ where: { id }, select: { id: true } });
  if (existing) await prisma.artifact.update({ where: { id }, data });
  else await prisma.artifact.create({ data: { ...data, id } });
}

/** 이 이관분이 아닌 프로젝트가 이미 쓰는 저장소 주소. OPUS 이관분과 PMS 운영분이 여기 걸린다. */
async function repositoriesTakenElsewhere(ownTopicIds: string[]): Promise<Set<string>> {
  const [topics, artifacts] = await Promise.all([
    prisma.topic.findMany({
      where: { sourceUrl: { not: null }, id: { notIn: ownTopicIds } },
      select: { sourceUrl: true },
    }),
    prisma.artifact.findMany({
      where: { type: "SOURCE_CODE", externalUrl: { not: null }, projectTeam: { projectId: { notIn: ownTopicIds } } },
      select: { externalUrl: true },
    }),
  ]);
  return new Set([
    ...topics.map(({ sourceUrl }) => sourceUrl!),
    ...artifacts.map(({ externalUrl }) => externalUrl!),
  ].map(normalizeRepoUrl));
}

async function main() {
  const snapshot = JSON.parse(
    await readFile(join(here, "github-archive", "snapshot.json"), "utf8"),
  ) as SnapshotProgram[];

  await prisma.user.upsert({
    where: { id: ARCHIVE_USER_ID },
    create: {
      id: ARCHIVE_USER_ID,
      name: "GitHub 이관",
      email: ARCHIVE_USER_EMAIL,
      role: "ADMIN",
      // 로그인 수단이 없는 기록용 계정이다. 활성 사용자로 세지 않도록 비활성으로 둔다.
      accountStatus: "DISABLED",
      emailVerified: false,
    },
    update: { name: "GitHub 이관", accountStatus: "DISABLED" },
  });

  const ownTopicIds = snapshot.flatMap(({ repos }) => repos.map(({ fullName }) => stableArchiveId("topic", fullName)));
  const taken = await repositoriesTakenElsewhere(ownTopicIds);

  for (const { program: source, repos } of snapshot) {
    const startsAt = new Date(`${source.startsAt}T00:00:00+09:00`);
    const endsAt = new Date(`${source.endsAt}T23:59:59+09:00`);
    const programId = source.programId ?? stableArchiveId("program", source.key);

    if (source.programId) {
      // 이미 만들어 둔 프로그램에 채운다. 이름, 기간, 공개 여부는 운영자가 화면에서 정한 대로 둔다.
      const found = await prisma.projectProgram.findUnique({ where: { id: programId }, select: { id: true } });
      if (!found) throw new Error(`프로그램 ${programId} 가 없습니다.`);
    } else {
      const program = {
        name: source.programName,
        startsAt,
        endsAt,
        projectRegistrationStartsAt: startsAt,
        projectRegistrationEndsAt: endsAt,
        // 관계자 등록 방식(studentProjectCreationEnabled=false)은 모집 기간이 필수다.
        recruitmentStartsAt: startsAt,
        recruitmentEndsAt: endsAt,
        studentProjectCreationEnabled: false,
        executionStartsAt: startsAt,
        executionEndsAt: endsAt,
        // 원본에 지도교수 정보가 없다. 켜 두면 상세 화면에 빈 지도교수 항목이 남는다.
        advisorEnabled: false,
        isPublic: true,
        firstPublishedAt: startsAt,
        endProcessedAt: endsAt,
        icon: "TROPHY" as const,
      };
      // 대분류는 처음 만들 때만 넣는다. 운영자가 화면에서 합친 대분류를 되돌리지 않는다.
      await prisma.projectProgram.upsert({
        where: { id: programId },
        create: { id: programId, category: source.category, ...program },
        update: program,
      });
    }

    let imported = 0;
    for (const repo of repos) {
      if (taken.has(normalizeRepoUrl(repo.url))) {
        console.log(`  이미 다른 프로젝트에 있어 건너뜀: ${repo.fullName}`);
        continue;
      }
      const topicId = stableArchiveId("topic", repo.fullName);
      const projectTeamId = stableArchiveId("team", repo.fullName);
      const topic = {
        programId,
        authorId: ARCHIVE_USER_ID,
        // 지난 프로젝트 조회가 담당자 이름을 그대로 읽는다. 비워 두면 조회가 실패한다.
        managerId: ARCHIVE_USER_ID,
        title: repo.title,
        description: repo.summary || repo.title,
        capacity: 1,
        status: "ACTIVE" as const,
        publishedAt: startsAt,
        recruitmentEnabled: false,
        sourceUrl: repo.url,
      };
      await prisma.topic.upsert({ where: { id: topicId }, create: { id: topicId, ...topic }, update: topic });
      const team = { name: repo.teamName, number: repo.teamNumber, confirmedAt: startsAt };
      await prisma.projectTeam.upsert({
        where: { id: projectTeamId },
        create: { id: projectTeamId, projectId: topicId, ...team },
        update: team,
      });
      await ensureArtifact(stableArchiveId("artifact", repo.fullName, "SOURCE_CODE"), {
        projectTeamId,
        registeredById: ARCHIVE_USER_ID,
        type: "SOURCE_CODE",
        title: "소스 코드",
        externalUrl: repo.url,
        position: 1,
      });
      imported += 1;
    }
    console.log(`${source.programName}: ${imported}/${repos.length}개 넣음`);
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
