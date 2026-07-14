import { GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import type {
  BackupProject,
  YearlyBackupWriter,
} from "@/modules/backup/application/create-yearly-backup";

type ManifestArtifact = Omit<BackupProject["artifacts"][number], "file"> & {
  file?: {
    relativePath: string;
    originalName: string;
    contentType: string;
    size: number;
    sha256: string;
  };
};

function safeFileName(originalName: string, maxBytes: number): string {
  const normalized = originalName.normalize("NFC").replace(/[\\/\0]/g, "_").trim();
  const candidate = normalized && normalized !== "." && normalized !== ".." ? normalized : "file";
  let result = "";
  let bytes = 0;
  for (const character of candidate) {
    const characterBytes = Buffer.byteLength(character);
    if (bytes + characterBytes > maxBytes) break;
    result += character;
    bytes += characterBytes;
  }
  return result || "file";
}

function backupDirectoryName(academicYear: number, createdAt: Date): string {
  return `${academicYear}-${createdAt.toISOString().replace(/[:.]/g, "-")}`;
}

export class FilesystemYearlyBackupWriter implements YearlyBackupWriter {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly outputRoot: string,
  ) {}

  async write(input: {
    academicYear: number;
    createdAt: Date;
    projects: BackupProject[];
  }): Promise<{ directory: string; fileCount: number }> {
    await mkdir(this.outputRoot, { recursive: true });
    const name = backupDirectoryName(input.academicYear, input.createdAt);
    const destination = path.resolve(this.outputRoot, name);
    const temporary = path.resolve(this.outputRoot, `.${name}.tmp`);
    await mkdir(temporary);

    let fileCount = 0;
    try {
      const projects = [] as Array<Omit<BackupProject, "artifacts"> & { artifacts: ManifestArtifact[] }>;
      for (const project of input.projects) {
        const artifacts: ManifestArtifact[] = [];
        for (const artifact of project.artifacts) {
          if (!artifact.file) {
            const { file: _file, ...manifestArtifact } = artifact;
            void _file;
            artifacts.push(manifestArtifact);
            continue;
          }
          const fileNamePrefix = `${artifact.id}-`;
          const relativePath = path.posix.join(
            "files",
            project.id,
            `${fileNamePrefix}${safeFileName(
              artifact.file.originalName,
              255 - Buffer.byteLength(fileNamePrefix),
            )}`,
          );
          const target = path.join(temporary, ...relativePath.split("/"));
          await mkdir(path.dirname(target), { recursive: true });
          await this.downloadAndVerify(artifact.file, target);
          fileCount += 1;
          artifacts.push({
            id: artifact.id,
            type: artifact.type,
            title: artifact.title,
            externalUrl: artifact.externalUrl,
            file: {
              relativePath,
              originalName: artifact.file.originalName,
              contentType: artifact.file.contentType,
              size: artifact.file.size,
              sha256: artifact.file.sha256,
            },
          });
        }
        projects.push({ ...project, artifacts });
      }
      await writeFile(path.join(temporary, "manifest.json"), `${JSON.stringify({
        schemaVersion: 1,
        academicYear: input.academicYear,
        createdAt: input.createdAt.toISOString(),
        projectCount: projects.length,
        fileCount,
        projects,
      }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await rename(temporary, destination);
      return { directory: destination, fileCount };
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      throw error;
    }
  }

  private async downloadAndVerify(
    file: NonNullable<BackupProject["artifacts"][number]["file"]>,
    target: string,
  ): Promise<void> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.objectKey,
    }));
    if (!response.Body) throw new Error(`백업 원본 객체가 없습니다: ${file.objectKey}`);
    const hash = createHash("sha256");
    let size = 0;
    const verifier = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk);
        size += chunk.length;
        callback(null, chunk);
      },
    });
    await pipeline(response.Body as Readable, verifier, createWriteStream(target, { flags: "wx" }));
    const sha256 = hash.digest("hex");
    if (size !== file.size || sha256 !== file.sha256) {
      throw new Error(`백업 무결성 검증에 실패했습니다: ${file.originalName}`);
    }
  }
}
