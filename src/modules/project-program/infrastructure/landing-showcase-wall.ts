import { readFile } from "node:fs/promises";
import path from "node:path";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  SHOWCASE_WALL_HEIGHT,
  SHOWCASE_WALL_TILE_HEIGHT,
  SHOWCASE_WALL_TILE_WIDTH,
  SHOWCASE_WALL_WIDTH,
  pickShowcaseWallPaths,
  showcaseWallTiles,
} from "@/modules/project-program/domain/showcase-wall-layout";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

/**
 * 벽에 올릴 프로그램.
 *
 * 해커톤과 AI 부스터 표지에 품이 가장 많이 들어가 있어 그 둘만 쓴다. 대분류 이름을
 * 통째로 바꾸면 여기도 같이 봐야 한다. 하나도 안 걸리면 손으로 만든 예비 그림으로 넘어간다.
 */
const WALL_CATEGORY_KEYWORDS = ["해커톤", "부스터"];

/** 후보를 넉넉히 받아 두고 고르기는 도메인에 맡긴다. 프로그램을 번갈아 집으려면 한쪽만 봐서는 안 된다. */
const CANDIDATE_LIMIT = 200;

/** 앱에서 올린 표지는 `/api/files/<파일 id>` 로 저장된다. 그 라우트는 로그인을 요구하므로 랜딩은 못 쓴다. */
const STORED_FILE_PREFIX = "/api/files/";

const CACHE_TTL_MS = 60 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { at: number; image: Buffer | null } | null = null;
let inFlight: Promise<Buffer | null> | null = null;

type WallThumbnail = { path: string; read: () => Promise<Buffer> };

async function readObject(objectKey: string): Promise<Buffer> {
  const result = await s3.send(new GetObjectCommand({ Bucket: objectStorageBucket, Key: objectKey }));
  const body = result.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!body?.transformToByteArray) throw new Error("객체 내용을 읽을 수 없습니다.");
  return Buffer.from(await body.transformToByteArray());
}

/** 아카이브를 손으로 심을 때 쓰인 표지는 스토리지가 아니라 `public` 아래 파일이다. */
async function readPublicFile(assetPath: string): Promise<Buffer> {
  const root = path.join(process.cwd(), "public");
  const resolved = path.resolve(root, `.${assetPath}`);
  if (!resolved.startsWith(root + path.sep)) throw new Error("public 밖의 경로입니다.");
  return await readFile(resolved);
}

/**
 * 확정된 해커톤 팀의 표지를 새것부터 칸 수만큼 가져온다.
 *
 * 팀 확정은 관리자나 교수가 누르는 것이라 그 자체가 최소한의 관문이다. 따로 심사는 없다.
 * 새 표지가 올라오고 팀이 확정되면 다음 재생성 때 알아서 벽에 들어온다.
 */
async function listWallThumbnails(client: PrismaClient): Promise<WallThumbnail[]> {
  const teams = await client.projectTeam.findMany({
    where: {
      confirmedAt: { not: null },
      project: {
        thumbnailPath: { not: null },
        program: {
          isPublic: true,
          OR: WALL_CATEGORY_KEYWORDS.map((keyword) => ({ category: { contains: keyword } })),
        },
      },
    },
    orderBy: { confirmedAt: "desc" },
    take: CANDIDATE_LIMIT,
    select: { project: { select: { programId: true, thumbnailPath: true } } },
  });
  const fileIds = teams
    .map(({ project }) => project.thumbnailPath!)
    .filter((thumbnailPath) => thumbnailPath.startsWith(STORED_FILE_PREFIX))
    .map((thumbnailPath) => thumbnailPath.slice(STORED_FILE_PREFIX.length));
  // 지워졌거나 아직 붙지 않은 파일은 스토리지에 없다. 고르기 전에 걸러야 칸이 비지 않는다.
  const objectKeys = new Map(fileIds.length === 0 ? [] : (await client.storedFile.findMany({
    where: { id: { in: fileIds }, status: "ATTACHED" },
    select: { id: true, objectKey: true },
  })).map(({ id, objectKey }) => [id, objectKey]));

  const readable = new Map<string, WallThumbnail>();
  const candidates: Array<{ programId: string; path: string }> = [];
  for (const { project } of teams) {
    const thumbnailPath = project.thumbnailPath!;
    if (thumbnailPath.startsWith(STORED_FILE_PREFIX)) {
      const objectKey = objectKeys.get(thumbnailPath.slice(STORED_FILE_PREFIX.length));
      if (!objectKey) continue;
      readable.set(thumbnailPath, { path: thumbnailPath, read: () => readObject(objectKey) });
    } else {
      readable.set(thumbnailPath, { path: thumbnailPath, read: () => readPublicFile(thumbnailPath) });
    }
    candidates.push({ programId: project.programId, path: thumbnailPath });
  }
  return pickShowcaseWallPaths(candidates).map((thumbnailPath) => readable.get(thumbnailPath)!);
}

async function composeWall(client: PrismaClient): Promise<Buffer | null> {
  const thumbnails = await listWallThumbnails(client);
  const tiles = showcaseWallTiles(thumbnails.map(({ path: thumbnailPath }) => thumbnailPath));
  if (tiles.length === 0) return null;

  // 표지가 칸보다 적으면 같은 것이 여러 칸에 들어간다. 표지별로 한 번만 읽고 한 번만 줄인다.
  const scaled = new Map(await Promise.all(thumbnails.map(async ({ path: thumbnailPath, read }) => [
    thumbnailPath,
    await sharp(await read())
      .resize(SHOWCASE_WALL_TILE_WIDTH, SHOWCASE_WALL_TILE_HEIGHT, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer(),
  ] as const)));

  return await sharp({
    create: {
      width: SHOWCASE_WALL_WIDTH,
      height: SHOWCASE_WALL_HEIGHT,
      channels: 3,
      background: "#0b1020",
    },
  })
    .composite(tiles.map(({ fileId, left, top }) => ({ input: scaled.get(fileId)!, left, top })))
    .webp({ quality: 72 })
    .toBuffer();
}

/**
 * 랜딩 배경 벽 그림. 없으면 `null` 이고 부르는 쪽이 예비 그림으로 넘긴다.
 *
 * 컨테이너 안에 한 시간 동안 들고 있는다. 스물네 장을 읽어 한 장으로 굽는 일이라
 * 요청마다 할 것이 아니고, 배경 그림이 한 시간 늦게 바뀌는 것은 아무도 모른다.
 * 동시에 들어온 요청은 같은 작업 하나를 함께 기다린다.
 */
export async function landingShowcaseWall(client: PrismaClient): Promise<Buffer | null> {
  const ttl = cached?.image ? CACHE_TTL_MS : FAILURE_CACHE_TTL_MS;
  if (cached && Date.now() - cached.at < ttl) return cached.image;
  inFlight ??= composeWall(client)
    .catch(() => null)
    .then((image) => {
      cached = { at: Date.now(), image };
      inFlight = null;
      return image;
    });
  return await inFlight;
}
