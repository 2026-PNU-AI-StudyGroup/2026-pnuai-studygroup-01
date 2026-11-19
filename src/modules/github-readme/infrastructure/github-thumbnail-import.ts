import { createHash, randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { parseGithubRepo } from "@/modules/github-readme/domain/readme";
import { downloadGithubImage, fetchGithubReadme, type ReadmeFailure } from "@/modules/github-readme/infrastructure/github-readme-client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { ArtifactManagementService } from "@/modules/report/application/manage-reports";
import { PrismaArtifactRepository } from "@/modules/report/infrastructure/prisma-artifact-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export type GithubThumbnailResult = "FILLED" | "SKIPPED" | "FORBIDDEN" | "NO_REPO" | "NO_IMAGE" | ReadmeFailure;

/**
 * README 첫 그림을 프로젝트 대표 이미지로 넣는다.
 *
 * replace 가 false 면 빈 칸만 채운다. 대표 이미지가 있거나 쇼케이스 사진을 하나라도 올린
 * 팀은 건너뛴다. 학생이 직접 넣은 그림을 덮지 않기 위해서다.
 *
 * 받은 그림은 학생이 올린 것과 같은 READY 파일로 만든 뒤 기존 setThumbnail 로 붙인다.
 * 권한, ATTACHED 승격, 이전 대표 이미지 정리를 그쪽이 맡는다. 붙이기에 실패한 READY 파일은
 * 정리 작업이 지운다.
 */
export async function importGithubThumbnail(
  actor: CurrentActor,
  input: { teamId: string; repoUrl: string; replace: boolean },
  now = new Date(),
): Promise<GithubThumbnailResult> {
  const repo = parseGithubRepo(input.repoUrl);
  if (!repo) return "NO_REPO";

  const team = await prisma.projectTeam.findUnique({
    where: { id: input.teamId },
    select: {
      project: { select: { thumbnailPath: true } },
      memberships: { where: { userId: actor.id, endedAt: null }, select: { id: true } },
      _count: { select: { artifacts: { where: { type: "IMAGE" } } } },
    },
  });
  // 남의 팀에 그림을 받아 두는 일이 없게 GitHub 를 부르기 전에 먼저 막는다.
  if (!team || (actor.role !== "ADMIN" && team.memberships.length === 0)) return "FORBIDDEN";
  if (!input.replace && (team.project.thumbnailPath || team._count.artifacts > 0)) return "SKIPPED";

  const readme = await fetchGithubReadme(repo, { token: process.env.GITHUB_TOKEN || undefined });
  if (!readme.ok) return readme.reason;
  if (!readme.preview.imageUrl) return "NO_IMAGE";
  const image = await downloadGithubImage(readme.preview.imageUrl);
  if (!image) return "NO_IMAGE";

  const fileId = randomUUID();
  const objectKey = `teams/${input.teamId}/files/${fileId}`;
  const digest = createHash("sha256").update(image.bytes);
  const sha256 = digest.copy().digest("hex");
  await s3.send(new PutObjectCommand({
    Bucket: objectStorageBucket,
    Key: objectKey,
    Body: image.bytes,
    ContentType: image.contentType,
    ChecksumSHA256: digest.digest("base64"),
  }));
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  await prisma.storedFile.create({
    data: {
      id: fileId,
      objectKey,
      uploadObjectKey: `staging/${input.teamId}/${fileId}`,
      projectTeamId: input.teamId,
      ownerId: actor.id,
      purpose: "ARTIFACT",
      consumer: "ARTIFACT",
      status: "READY",
      originalName: `${repo.repo}-readme`,
      contentType: image.contentType,
      size: image.bytes.length,
      sha256,
      expiresAt,
      // 제약: cleanupAfter 는 expiresAt 보다 하루 이상 뒤
      cleanupAfter: new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000),
      readyAt: now,
    },
  });
  await new ArtifactManagementService(new PrismaArtifactRepository(prisma)).setThumbnail(actor, { teamId: input.teamId, fileId }, now);
  return "FILLED";
}
