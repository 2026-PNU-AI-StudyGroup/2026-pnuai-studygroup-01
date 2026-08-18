import "dotenv/config";

import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type ArtifactType, Prisma, PrismaClient } from "../src/generated/prisma/client";
import { objectStorageBucket, s3 } from "../src/shared/infrastructure/object-storage/s3";

// OPUS(opus.pusan.ac.kr) 공개 API 스냅샷을 지난 프로젝트로 옮긴다.
// 원본에는 이름만 있고 이메일이 없어 팀원 계정은 만들지 않는다. 이름은 프로젝트 소개 글에 남긴다.
// 같은 스냅샷으로 몇 번을 돌려도 같은 결과가 되도록 모든 식별자를 출처 ID에서 유도한다.

const here = dirname(fileURLToPath(import.meta.url));
const snapshotDir = join(here, "opus-archive");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
if (!process.argv.includes("--confirm")) {
  throw new Error("실제 데이터를 씁니다. --confirm 을 붙여 실행하세요.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const ARCHIVE_USER_ID = "opus-archive-importer";
const ARCHIVE_USER_EMAIL = "opus-archive@aipms.pusan.ac.kr";

/** 출처 키에서 항상 같은 UUID 를 만든다. 재실행해도 새 행이 생기지 않도록. */
function stableId(...parts: (string | number)[]): string {
  const hex = createHash("sha256").update(`opus:${parts.join(":")}`).digest("hex");
  const variant = ((Number.parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: objectStorageBucket, Key: objectKey }));
    return true;
  } catch {
    return false;
  }
}

type SnapshotImage = { label: string; file?: string; contentType?: string; size?: number };

type SnapshotTeam = {
  teamId: number;
  teamName: string;
  projectName: string;
  teamMembers: { teamMemberName: string; roleType: string }[];
  githubPath: string | null;
  youTubePath: string | null;
  productionPath: string | null;
  overview: string | null;
  awards: { awardName: string }[];
  images: SnapshotImage[];
};

type SnapshotContest = {
  contest: { contestId: number; contestName: string; categoryName: string };
  teams: SnapshotTeam[];
};

// 원본 개요가 운영자 안내용 자리표시자로 남아 있는 팀이 있다. 그대로 노출하지 않는다.
const PLACEHOLDER = /페이지 수정 목록/;

// 스냅샷에는 대회 운영 기간이 없다. 프로그램별 실제 일정을 여기서 지정한다.
const PROGRAM_PERIOD: Record<number, { startsAt: string; endsAt: string; category: string }> = {
  1: { startsAt: "2025-08-27", endsAt: "2025-12-31", category: "PNU 창의융합 해커톤" },
  4: { startsAt: "2025-03-01", endsAt: "2025-08-31", category: "PNU AI 부스터" },
};

function teamDisplayName(raw: string): string {
  // "9. 손길모아", "A-1. Broom" 처럼 앞에 붙은 번호는 우리 화면에서 의미가 없다.
  return raw.replace(/^[A-Za-z]?-?\d+\.\s*/, "").trim() || raw.trim();
}

function buildIntro(team: SnapshotTeam): string {
  const sections: string[] = [];
  const awards = team.awards.map(({ awardName }) => awardName).filter(Boolean);
  if (awards.length) sections.push(`**${awards.join(" · ")}**`);
  const overview = team.overview?.trim();
  if (overview && !PLACEHOLDER.test(overview)) sections.push(overview);
  const leader = team.teamMembers.find(({ roleType }) => roleType.includes("팀장"));
  const members = team.teamMembers.filter((member) => member !== leader);
  const roster = [
    leader ? `팀장 ${leader.teamMemberName}` : null,
    members.length ? `팀원 ${members.map(({ teamMemberName }) => teamMemberName).join(" · ")}` : null,
  ].filter(Boolean).join("\n\n");
  if (roster) sections.push(roster);
  return sections.join("\n\n");
}

// 첨부가 끝난 stored_file 은 트리거가 수정을 막는다. 이미 있으면 손대지 않는다.
async function ensureImageFile(input: {
  teamId: string;
  sourceTeamId: number;
  image: SnapshotImage;
  attachedAt: Date;
  // 갤러리 이미지는 아티팩트 트리거가 READY -> ATTACHED 로 올린다.
  // 대표 이미지는 연결되는 아티팩트 행이 없어 처음부터 ATTACHED 로 넣는다.
  status: "READY" | "ATTACHED";
}): Promise<string | null> {
  if (!input.image.file) return null;
  const fileId = stableId("file", input.sourceTeamId, input.image.label);
  const objectKey = `teams/${input.teamId}/files/${fileId}`;
  const recorded = await prisma.storedFile.findUnique({ where: { id: fileId }, select: { id: true } });
  if (recorded && await objectExists(objectKey)) return fileId;
  const bytes = await readFile(join(snapshotDir, "images", input.image.file));
  await s3.send(new PutObjectCommand({
    Bucket: objectStorageBucket,
    Key: objectKey,
    Body: bytes,
    ContentType: input.image.contentType ?? "image/webp",
    ChecksumSHA256: createHash("sha256").update(bytes).digest("base64"),
  }));
  // 행만 남고 객체가 없는 중단 상태에서도 다시 돌리면 복구되도록 객체는 항상 올린다.
  if (recorded) return fileId;
  await prisma.storedFile.create({
    data: {
      id: fileId,
      objectKey,
      uploadObjectKey: `staging/${objectKey}`,
      projectTeamId: input.teamId,
      ownerId: ARCHIVE_USER_ID,
      purpose: "ARTIFACT",
      consumer: "ARTIFACT",
      status: input.status,
      originalName: input.image.file,
      contentType: input.image.contentType ?? "image/webp",
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      // 스테이징 만료·정리 시각은 첨부된 파일에 쓰이지 않지만 하루 이상 간격이라는 제약이 있다.
      expiresAt: input.attachedAt,
      cleanupAfter: new Date(input.attachedAt.getTime() + 2 * 86_400_000),
      readyAt: input.attachedAt,
    },
  });
  return fileId;
}

// artifact 는 BEFORE INSERT 트리거로 파일을 첨부한다. prisma 의 upsert 는
// INSERT ... ON CONFLICT 라 이미 있는 행에도 INSERT 트리거가 먼저 돌아 실패한다.
// 존재 여부를 먼저 확인해 INSERT 와 UPDATE 를 갈라 보낸다.
async function ensureArtifact(id: string, data: Prisma.ArtifactUncheckedCreateInput): Promise<void> {
  const existing = await prisma.artifact.findUnique({ where: { id }, select: { id: true } });
  if (existing) await prisma.artifact.update({ where: { id }, data });
  else await prisma.artifact.create({ data: { ...data, id } });
}

async function main() {
  const snapshot: SnapshotContest[] = JSON.parse(
    await readFile(join(snapshotDir, "snapshot.json"), "utf8"),
  );
  const imageFiles = new Set(await readdir(join(snapshotDir, "images")));

  await prisma.user.upsert({
    where: { id: ARCHIVE_USER_ID },
    create: {
      id: ARCHIVE_USER_ID,
      name: "이전 시스템 이관",
      email: ARCHIVE_USER_EMAIL,
      role: "ADMIN",
      // 로그인 수단이 없는 기록용 계정이다. 목록에서 활성 사용자로 세지 않도록 비활성으로 둔다.
      accountStatus: "DISABLED",
      emailVerified: false,
    },
    update: { name: "이전 시스템 이관", accountStatus: "DISABLED" },
  });

  for (const { contest, teams } of snapshot) {
    const period = PROGRAM_PERIOD[contest.contestId];
    if (!period) throw new Error(`대회 ${contest.contestId} 의 운영 기간이 정의되지 않았습니다.`);
    const startsAt = new Date(`${period.startsAt}T00:00:00+09:00`);
    const endsAt = new Date(`${period.endsAt}T23:59:59+09:00`);
    const programId = stableId("program", contest.contestId);
    const program = {
      name: contest.contestName,
      category: period.category,
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
    await prisma.projectProgram.upsert({
      where: { id: programId },
      create: { id: programId, ...program },
      update: program,
    });

    for (const team of teams) {
      const topicId = stableId("topic", team.teamId);
      const projectTeamId = stableId("team", team.teamId);
      const overview = team.overview?.trim();
      const topic = {
        programId,
        authorId: ARCHIVE_USER_ID,
        // 지난 프로젝트 조회가 담당자 이름을 그대로 읽는다. 비워 두면 조회가 실패한다.
        managerId: ARCHIVE_USER_ID,
        title: team.projectName,
        description: overview && !PLACEHOLDER.test(overview) ? overview : team.projectName,
        capacity: Math.max(1, team.teamMembers.length),
        status: "ACTIVE" as const,
        publishedAt: startsAt,
        recruitmentEnabled: false,
        sourceUrl: team.githubPath,
      };
      await prisma.topic.upsert({
        where: { id: topicId },
        create: { id: topicId, ...topic },
        update: topic,
      });

      const showcaseIntro = buildIntro(team);
      const projectTeam = {
        name: teamDisplayName(team.teamName),
        confirmedAt: startsAt,
        showcaseIntro,
      };
      await prisma.projectTeam.upsert({
        where: { id: projectTeamId },
        create: { id: projectTeamId, projectId: topicId, ...projectTeam },
        update: projectTeam,
      });

      const usable = team.images.filter(({ file }) => file && imageFiles.has(file));
      const thumbnail = usable.find(({ label }) => label === "thumbnail");
      const previews = usable.filter(({ label }) => label !== "thumbnail");

      const thumbnailFileId = thumbnail
        ? await ensureImageFile({ teamId: projectTeamId, sourceTeamId: team.teamId, image: thumbnail, attachedAt: startsAt, status: "ATTACHED" })
        : null;
      await prisma.topic.update({
        where: { id: topicId },
        data: { thumbnailPath: thumbnailFileId ? `/api/files/${thumbnailFileId}` : null },
      });

      const artifactIds: string[] = [];
      let position = 0;
      for (const [index, image] of previews.entries()) {
        const fileId = await ensureImageFile({ teamId: projectTeamId, sourceTeamId: team.teamId, image, attachedAt: startsAt, status: "READY" });
        if (!fileId) continue;
        const id = stableId("artifact", team.teamId, "image", image.label);
        const data = {
          projectTeamId,
          registeredById: ARCHIVE_USER_ID,
          type: "IMAGE" as const,
          title: `${team.projectName} 이미지 ${index + 1}`,
          fileId,
          position: position += 1,
        };
        await ensureArtifact(id, data);
        artifactIds.push(id);
      }

      const links: [ArtifactType, string, string | null][] = [
        ["SOURCE_CODE", "소스 코드", team.githubPath],
        ["PRESENTATION_VIDEO", "발표 영상", team.youTubePath],
        ["OTHER", "서비스 바로가기", team.productionPath],
      ];
      for (const [type, title, url] of links) {
        if (!url) continue;
        const id = stableId("artifact", team.teamId, type);
        const data = {
          projectTeamId,
          registeredById: ARCHIVE_USER_ID,
          type,
          title,
          externalUrl: url,
          position: position += 1,
        };
        await ensureArtifact(id, data);
        artifactIds.push(id);
      }

      // 스냅샷에서 빠진 항목이 지난 실행의 찌꺼기로 남지 않게 한다.
      await prisma.artifact.deleteMany({ where: { projectTeamId, id: { notIn: artifactIds } } });
    }
    console.log(`${contest.contestName}: ${teams.length}팀 이관 완료`);
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
