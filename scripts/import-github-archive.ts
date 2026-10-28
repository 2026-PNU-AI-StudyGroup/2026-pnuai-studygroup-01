import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeRepoUrl, stableArchiveId, type SnapshotProgram } from "./github-archive";

// scripts/github-archive/snapshot.json 을 지난 프로그램과 프로젝트로 넣는다.
// OPUS 이관(import-opus-archive.ts)과 같이 모든 ID 를 저장소 이름에서 유도해 몇 번을 돌려도 행이 늘지 않는다.
// 만들기만 하고 이미 있는 프로그램과 프로젝트는 건드리지 않는다. 운영자가 화면에서 바꾸거나 지운 것이
// 다시 돌려도 살아남는다. 그래서 다시 돌리면 스냅샷에 새로 생긴 레포만 들어간다.
// 프로젝트를 내리려면 화면에서 숨기거나 지우고 snapshot.json 에서도 뺀다. 빼지 않으면
// 다음에 돌릴 때 지운 프로젝트가 다시 생긴다. 팀원 계정과 사진은 넣지 않는다.
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
        icon: source.icon ?? "TROPHY",
      };
      // 모든 값을 처음 만들 때만 넣는다. 운영자가 화면에서 바꾼 이름, 기간, 공개 여부, 대분류는
      // 다시 돌려도 되돌아가지 않는다.
      await prisma.projectProgram.upsert({
        where: { id: programId },
        create: { id: programId, category: source.category, ...program },
        update: {},
      });
    }

    let created = 0;
    let existing = 0;
    let duplicate = 0;
    for (const repo of repos) {
      const topicId = stableArchiveId("topic", repo.fullName);
      if (await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } })) {
        console.log(`  이미 넣은 프로젝트라 건너뜀: ${repo.fullName}`);
        existing += 1;
        continue;
      }
      if (repo.url && taken.has(normalizeRepoUrl(repo.url))) {
        console.log(`  이미 다른 프로젝트에 있어 건너뜀: ${repo.fullName}`);
        duplicate += 1;
        continue;
      }
      const projectTeamId = stableArchiveId("team", repo.fullName);
      // 셋을 한 번에 넣는다. 주제만 들어가고 멈추면 다음 실행이 "이미 있음" 으로 건너뛰어
      // 팀 없는 주제가 화면에 영영 안 나온다.
      await prisma.$transaction(async (tx) => {
        await tx.topic.create({
          data: {
            id: topicId,
            programId,
            authorId: ARCHIVE_USER_ID,
            // 지난 프로젝트 조회가 담당자 이름을 그대로 읽는다. 비워 두면 조회가 실패한다.
            managerId: ARCHIVE_USER_ID,
            title: repo.title,
            description: repo.summary || repo.title,
            capacity: 1,
            status: "ACTIVE",
            publishedAt: startsAt,
            recruitmentEnabled: false,
            sourceUrl: repo.url,
          },
        });
        await tx.projectTeam.create({
          data: { id: projectTeamId, projectId: topicId, name: repo.teamName, number: repo.teamNumber, award: repo.award, confirmedAt: startsAt },
        });
        if (repo.url) {
          await tx.artifact.create({
            data: {
              id: stableArchiveId("artifact", repo.fullName, "SOURCE_CODE"),
              projectTeamId,
              registeredById: ARCHIVE_USER_ID,
              type: "SOURCE_CODE",
              title: "소스 코드",
              externalUrl: repo.url,
              position: 1,
            },
          });
        }
        if (repo.videoUrl) {
          await tx.artifact.create({
            data: {
              id: stableArchiveId("artifact", repo.fullName, "PRESENTATION_VIDEO"),
              projectTeamId,
              registeredById: ARCHIVE_USER_ID,
              type: "PRESENTATION_VIDEO",
              title: "발표 영상",
              externalUrl: repo.videoUrl,
              position: 2,
            },
          });
        }
      });
      created += 1;
    }
    console.log(`${source.programName}: 새로 ${created}개, 이미 있음 ${existing}개, 다른 프로젝트와 겹쳐 건너뜀 ${duplicate}개`);
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
