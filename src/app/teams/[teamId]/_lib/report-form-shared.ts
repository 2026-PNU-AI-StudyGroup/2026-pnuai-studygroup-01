"use client";

import type { ReportActionState } from "@/app/teams/[teamId]/_actions/team-report-actions";
import {
  InvalidUploadError,
  validateUpload,
  type FilePurpose,
} from "@/modules/file/domain/upload-policy";
export { koreanDateTimeInput } from "@/shared/ui/date-time-input-value";

export const initialReportActionState: ReportActionState = { status: "idle", message: "" };
export const uploadFailureMessage = "파일을 업로드하지 못했습니다. 파일 형식과 용량을 확인한 뒤 다시 시도해 주세요.";
export const koreanDateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

async function uploadErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return uploadFailureMessage;
}

export type TeamFileUploadStage = "hashing" | "preparing" | "uploading" | "completing";

export type TeamFileUploadProgress = {
  stage: TeamFileUploadStage;
  loaded: number;
  total: number;
  percent: number | null;
};

export function teamFileUploadProgressLabel(progress: TeamFileUploadProgress): string {
  if (progress.stage === "hashing") return `파일 검증 중 ${progress.percent ?? 0}%`;
  if (progress.stage === "preparing") return "업로드 준비 중";
  if (progress.stage === "uploading") return `파일 업로드 중 ${progress.percent ?? 0}%`;
  return "등록 완료 중";
}

type UploadTeamFileOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: TeamFileUploadProgress) => void;
};

const HASH_CHUNK_SIZE = 2 * 1024 * 1024;
const SHA256_BLOCK_SIZE = 64;
const VALID_SHA256_PLACEHOLDER = "0".repeat(64);
const SHA256_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

class IncrementalSha256 {
  private readonly state = new Uint32Array([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ]);
  private readonly buffer = new Uint8Array(SHA256_BLOCK_SIZE);
  // Reuse one message schedule for every 64-byte block. A 1GB file contains
  // millions of blocks, so allocating this buffer per transform is prohibitive.
  private readonly words = new Uint32Array(64);
  private bufferLength = 0;
  private bytesHashed = 0;
  private finished = false;

  update(bytes: Uint8Array): void {
    if (this.finished) throw new Error("SHA-256 digest has already been finalized.");
    this.bytesHashed += bytes.length;
    let offset = 0;

    if (this.bufferLength > 0) {
      const remaining = SHA256_BLOCK_SIZE - this.bufferLength;
      const copied = Math.min(remaining, bytes.length);
      this.buffer.set(bytes.subarray(0, copied), this.bufferLength);
      this.bufferLength += copied;
      offset = copied;
      if (this.bufferLength === SHA256_BLOCK_SIZE) {
        this.transform(this.buffer, 0);
        this.bufferLength = 0;
      }
    }

    while (offset + SHA256_BLOCK_SIZE <= bytes.length) {
      this.transform(bytes, offset);
      offset += SHA256_BLOCK_SIZE;
    }

    if (offset < bytes.length) {
      this.buffer.set(bytes.subarray(offset), 0);
      this.bufferLength = bytes.length - offset;
    }
  }

  digest(): Uint8Array {
    if (this.finished) throw new Error("SHA-256 digest has already been finalized.");
    this.finished = true;
    this.buffer[this.bufferLength] = 0x80;
    this.bufferLength += 1;

    if (this.bufferLength > 56) {
      this.buffer.fill(0, this.bufferLength);
      this.transform(this.buffer, 0);
      this.bufferLength = 0;
    }
    this.buffer.fill(0, this.bufferLength, 56);

    const bitLengthHigh = Math.floor(this.bytesHashed / 0x20000000) >>> 0;
    const bitLengthLow = (this.bytesHashed << 3) >>> 0;
    this.writeUint32(this.buffer, 56, bitLengthHigh);
    this.writeUint32(this.buffer, 60, bitLengthLow);
    this.transform(this.buffer, 0);

    const result = new Uint8Array(32);
    this.state.forEach((value, index) => this.writeUint32(result, index * 4, value));
    return result;
  }

  private transform(bytes: Uint8Array, offset: number): void {
    const words = this.words;
    for (let index = 0; index < 16; index += 1) {
      const wordOffset = offset + index * 4;
      words[index] = (
        (bytes[wordOffset] << 24) |
        (bytes[wordOffset + 1] << 16) |
        (bytes[wordOffset + 2] << 8) |
        bytes[wordOffset + 3]
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const lower = words[index - 15];
      const upper = words[index - 2];
      const sigma0 = rotateRight(lower, 7) ^ rotateRight(lower, 18) ^ (lower >>> 3);
      const sigma1 = rotateRight(upper, 17) ^ rotateRight(upper, 19) ^ (upper >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let a = this.state[0];
    let b = this.state[1];
    let c = this.state[2];
    let d = this.state[3];
    let e = this.state[4];
    let f = this.state[5];
    let g = this.state[6];
    let h = this.state[7];

    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choice + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    this.state[0] = (this.state[0] + a) >>> 0;
    this.state[1] = (this.state[1] + b) >>> 0;
    this.state[2] = (this.state[2] + c) >>> 0;
    this.state[3] = (this.state[3] + d) >>> 0;
    this.state[4] = (this.state[4] + e) >>> 0;
    this.state[5] = (this.state[5] + f) >>> 0;
    this.state[6] = (this.state[6] + g) >>> 0;
    this.state[7] = (this.state[7] + h) >>> 0;
  }

  private writeUint32(target: Uint8Array, offset: number, value: number): void {
    target[offset] = value >>> 24;
    target[offset + 1] = value >>> 16;
    target[offset + 2] = value >>> 8;
    target[offset + 3] = value;
  }
}

function uploadAbortError(): DOMException {
  return new DOMException("파일 업로드를 취소했습니다.", "AbortError");
}

function assertUploadActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw uploadAbortError();
}

function emitProgress(
  callback: UploadTeamFileOptions["onProgress"],
  stage: TeamFileUploadStage,
  loaded: number,
  total: number,
): void {
  callback?.({
    stage,
    loaded,
    total,
    percent: total > 0 ? Math.round((loaded / total) * 100) : null,
  });
}

function validateUploadCandidate(purpose: FilePurpose, file: File): void {
  try {
    validateUpload({
      purpose,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      sha256: VALID_SHA256_PLACEHOLDER,
    });
  } catch (error) {
    if (error instanceof InvalidUploadError) {
      throw new Error(
        purpose === "REPORT"
          ? "PDF 또는 Word 파일만 제출할 수 있으며 최대 용량은 25MB입니다."
          : "지원되는 결과물 파일만 등록할 수 있으며 최대 용량은 1GB입니다.",
      );
    }
    throw error;
  }
}

export async function hashTeamFile(
  file: File,
  options: Pick<UploadTeamFileOptions, "signal" | "onProgress"> = {},
): Promise<Uint8Array> {
  const hasher = new IncrementalSha256();
  emitProgress(options.onProgress, "hashing", 0, file.size);
  for (let offset = 0; offset < file.size; offset += HASH_CHUNK_SIZE) {
    assertUploadActive(options.signal);
    const end = Math.min(offset + HASH_CHUNK_SIZE, file.size);
    const chunk = new Uint8Array(await file.slice(offset, end).arrayBuffer());
    assertUploadActive(options.signal);
    hasher.update(chunk);
    emitProgress(options.onProgress, "hashing", end, file.size);
    if (end < file.size) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }
  return hasher.digest();
}

function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  checksum: string,
  options: UploadTeamFileOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(uploadAbortError());
      return;
    }
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => options.signal?.removeEventListener("abort", abort);
    request.open("PUT", uploadUrl);
    request.setRequestHeader("content-type", file.type);
    request.setRequestHeader("x-amz-checksum-sha256", checksum);
    request.upload.onprogress = (event) => {
      emitProgress(options.onProgress, "uploading", event.loaded, event.lengthComputable ? event.total : file.size);
    };
    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) {
        emitProgress(options.onProgress, "uploading", file.size, file.size);
        resolve();
      } else {
        reject(new Error(uploadFailureMessage));
      }
    };
    request.onerror = () => {
      cleanup();
      reject(new Error(uploadFailureMessage));
    };
    request.onabort = () => {
      cleanup();
      reject(uploadAbortError());
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    emitProgress(options.onProgress, "uploading", 0, file.size);
    request.send(file);
  });
}

export function isUploadAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function uploadTeamFile(
  teamId: string,
  purpose: FilePurpose,
  file: File,
  options: UploadTeamFileOptions = {},
): Promise<string> {
  validateUploadCandidate(purpose, file);
  assertUploadActive(options.signal);
  const digest = await hashTeamFile(file, options);
  const sha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const checksum = btoa(String.fromCharCode(...digest));
  emitProgress(options.onProgress, "preparing", 0, 0);
  const presign = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      teamId,
      purpose,
      consumer: purpose,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      sha256,
    }),
    signal: options.signal,
  });
  if (!presign.ok) throw new Error(await uploadErrorMessage(presign));

  const { uploadId, uploadUrl } = await presign.json() as { uploadId: string; uploadUrl: string };
  await uploadFileWithProgress(uploadUrl, file, checksum, options);

  emitProgress(options.onProgress, "completing", 0, 0);
  const completed = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadId }),
    signal: options.signal,
  });
  if (!completed.ok) throw new Error(await uploadErrorMessage(completed));
  return uploadId;
}
