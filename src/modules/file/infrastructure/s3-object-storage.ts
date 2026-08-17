import { Readable } from "node:stream";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

import type { ObjectStorage } from "@/modules/file/application/manage-upload";
import { InvalidUploadError } from "@/modules/file/domain/upload-policy";

export class S3ObjectStorage implements ObjectStorage {
  constructor(private readonly client: S3Client, private readonly bucket: string) {}

  async write(input: {
    objectKey: string;
    body: ReadableStream<Uint8Array>;
    contentType: string;
    size: number;
    sha256: string;
  }): Promise<void> {
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        // ContentLength 를 넘겨야 SDK 가 본문을 버퍼링하지 않고 그대로 흘려보낸다.
        Body: Readable.fromWeb(input.body as Parameters<typeof Readable.fromWeb>[0]),
        ContentType: input.contentType,
        ContentLength: input.size,
        // 체크섬은 스토리지가 수신 본문으로 직접 검증한다. 길이나 내용이 다르면 여기서 거부된다.
        ChecksumSHA256: Buffer.from(input.sha256, "hex").toString("base64"),
      }));
    } catch (error) {
      if (isClientError(error)) {
        throw new InvalidUploadError("업로드한 파일 내용이 등록한 정보와 다릅니다.");
      }
      throw error;
    }
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

  async readPrefix(objectKey: string, length: number): Promise<Uint8Array> {
    const result = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Range: `bytes=0-${Math.max(0, length - 1)}`,
    }));
    const body = result.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
    if (!body?.transformToByteArray) throw new Error("객체 내용을 읽을 수 없습니다.");
    return body.transformToByteArray();
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

/** 스토리지가 4xx 로 거절한 요청은 보낸 쪽 잘못이다. 서버 오류로 올리면 로그만 더럽힌다. */
function isClientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return status !== undefined && status >= 400 && status < 500;
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.name === "NoSuchKey" || candidate.$metadata?.httpStatusCode === 404;
}
