import type { S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BackupProject } from "@/modules/backup/application/create-yearly-backup";
import { FilesystemYearlyBackupWriter } from "@/modules/backup/infrastructure/filesystem-yearly-backup-writer";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function fixture(content: Buffer, originalName = "../source.zip"): BackupProject[] {
  return [{
    id: "team-1",
    term: "FIRST",
    teamName: "테스트 팀",
    topicTitle: "테스트 주제",
    topicDescription: "설명",
    professorName: "교수",
    memberNames: ["학생"],
    artifacts: [{
      id: "artifact-1",
      type: "SOURCE_CODE",
      title: "소스 코드",
      file: {
        objectKey: "objects/source.zip",
        originalName,
        contentType: "application/zip",
        size: content.length,
        sha256: createHash("sha256").update(content).digest("hex"),
      },
    }],
  }];
}

describe("파일시스템 연도별 백업 writer", () => {
  it("객체를 스트리밍하고 체크섬이 포함된 manifest를 원자적으로 완성한다", async () => {
    const root = path.join(tmpdir(), `pms-backup-${crypto.randomUUID()}`);
    roots.push(root);
    const content = Buffer.from("verified artifact");
    const client = { send: vi.fn(async () => ({ Body: Readable.from(content) })) } as unknown as S3Client;
    const writer = new FilesystemYearlyBackupWriter(client, "bucket", root);
    const createdAt = new Date("2026-12-31T15:00:00.000Z");

    const result = await writer.write({ academicYear: 2026, createdAt, projects: fixture(content) });

    expect(result.fileCount).toBe(1);
    expect(await readdir(root)).toEqual(["2026-2026-12-31T15-00-00-000Z"]);
    const manifest = JSON.parse(await readFile(path.join(result.directory, "manifest.json"), "utf8"));
    const relativePath = manifest.projects[0].artifacts[0].file.relativePath as string;
    expect(relativePath).toBe("files/team-1/artifact-1-.._source.zip");
    expect(await readFile(path.join(result.directory, relativePath))).toEqual(content);
    expect(manifest).toMatchObject({ schemaVersion: 1, academicYear: 2026, projectCount: 1, fileCount: 1 });
  });

  it("객체 무결성이 다르면 미완성 백업을 제거한다", async () => {
    const root = path.join(tmpdir(), `pms-backup-${crypto.randomUUID()}`);
    roots.push(root);
    const expected = Buffer.from("expected");
    const client = {
      send: vi.fn(async () => ({ Body: Readable.from(Buffer.from("corrupted")) })),
    } as unknown as S3Client;
    const writer = new FilesystemYearlyBackupWriter(client, "bucket", root);

    await expect(writer.write({
      academicYear: 2026,
      createdAt: new Date("2026-12-31T15:00:00.000Z"),
      projects: fixture(expected),
    })).rejects.toThrow("백업 무결성 검증에 실패했습니다");
    expect(await readdir(root)).toEqual([]);
  });

  it("긴 한글 파일명을 파일시스템의 UTF-8 바이트 제한 안에서 보존한다", async () => {
    const root = path.join(tmpdir(), `pms-backup-${crypto.randomUUID()}`);
    roots.push(root);
    const content = Buffer.from("long Korean filename");
    const client = { send: vi.fn(async () => ({ Body: Readable.from(content) })) } as unknown as S3Client;
    const writer = new FilesystemYearlyBackupWriter(client, "bucket", root);

    const result = await writer.write({
      academicYear: 2026,
      createdAt: new Date("2026-12-31T15:00:00.000Z"),
      projects: fixture(content, `${"한".repeat(255)}.zip`),
    });

    const manifest = JSON.parse(await readFile(path.join(result.directory, "manifest.json"), "utf8"));
    const relativePath = manifest.projects[0].artifacts[0].file.relativePath as string;
    expect(Buffer.byteLength(path.basename(relativePath))).toBeLessThanOrEqual(255);
    expect(await readFile(path.join(result.directory, relativePath))).toEqual(content);
  });
});
