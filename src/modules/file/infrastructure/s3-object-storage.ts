import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ObjectStorage, UploadIntent } from "@/modules/file/application/manage-upload";

export class S3ObjectStorage implements ObjectStorage {
  constructor(private readonly client: S3Client, private readonly bucket: string) {}

  async createUploadUrl(input: UploadIntent): Promise<{ url: string; expiresAt: Date }> {
    const checksum = Buffer.from(input.sha256, "hex").toString("base64");
    const signedAt = new Date();
    const url = await getSignedUrl(this.client, new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.uploadObjectKey,
      ContentType: input.contentType,
      ContentLength: input.size,
      ChecksumSHA256: checksum,
    }), {
      expiresIn: 15 * 60,
      signingDate: signedAt,
      signableHeaders: new Set(["content-type"]),
      unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
    });
    return { url, expiresAt: new Date(signedAt.getTime() + 15 * 60_000) };
  }

  async inspect(objectKey: string) {
    let result;
    try {
      result = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ChecksumMode: "ENABLED",
      }));
    } catch (error) {
      if (isNotFound(error)) return {};
      throw error;
    }
    return {
      contentType: result.ContentType,
      size: result.ContentLength,
      sha256: result.ChecksumSHA256
        ? Buffer.from(result.ChecksumSHA256, "base64").toString("hex")
        : undefined,
    };
  }

  async remove(objectKey: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  async promote(uploadObjectKey: string, objectKey: string) {
    const copySource = encodeURIComponent(`${this.bucket}/${uploadObjectKey}`).replaceAll("%2F", "/");
    await this.client.send(new CopyObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      CopySource: copySource,
      ChecksumAlgorithm: "SHA256",
      MetadataDirective: "COPY",
    }));
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404;
}
