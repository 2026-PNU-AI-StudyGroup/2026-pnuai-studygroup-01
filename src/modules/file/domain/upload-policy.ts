export type FilePurpose = "REPORT" | "ARTIFACT" | "ANNOUNCEMENT";
export type UploadConsumer = "REPORT" | "ARTIFACT" | "ANNOUNCEMENT";

export const ANNOUNCEMENT_ATTACHMENT_MAX_BYTES = 500 * 1024 * 1024;
export const ANNOUNCEMENT_ATTACHMENT_MAX_COUNT = 5;
export const ARTIFACT_MAX_BYTES = 100 * 1024 * 1024;
export const SHOWCASE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

const REPORT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ARTIFACT_TYPES = new Set([
  ...REPORT_TYPES,
  "application/zip",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
export class InvalidUploadError extends Error {
  constructor(message = "허용되지 않은 파일입니다.") {
    super(message);
    this.name = "InvalidUploadError";
  }
}

export function validateUpload(input: {
  purpose: FilePurpose;
  consumer?: UploadConsumer;
  originalName: string;
  contentType: string;
  size: number;
  sha256: string;
}) {
  const originalName = input.originalName.trim();
  const consumer = input.consumer ?? input.purpose;
  const contentType = input.contentType.trim() || "application/octet-stream";
  const allowedTypes = consumer === "REPORT"
    ? REPORT_TYPES
    : consumer === "ARTIFACT"
      ? ARTIFACT_TYPES
      : null;
  const maxSize = consumer === "REPORT"
    ? 25 * 1024 * 1024
    : consumer === "ARTIFACT"
      ? ARTIFACT_MAX_BYTES
      : ANNOUNCEMENT_ATTACHMENT_MAX_BYTES;
  const expectedPurpose: FilePurpose = consumer;
  if (
    originalName.length < 1 ||
    originalName.length > 255 ||
    input.purpose !== expectedPurpose ||
    contentType.length > 255 ||
    (allowedTypes !== null && !allowedTypes.has(contentType)) ||
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > maxSize ||
    !/^[0-9a-f]{64}$/.test(input.sha256)
  ) {
    throw new InvalidUploadError();
  }
  return { ...input, consumer, originalName, contentType };
}
