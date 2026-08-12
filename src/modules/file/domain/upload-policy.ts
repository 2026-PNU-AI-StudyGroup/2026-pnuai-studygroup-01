export type FilePurpose = "REPORT" | "ARTIFACT";
export type UploadConsumer = "REPORT" | "ARTIFACT";

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
  "video/mp4",
  "video/webm",
  "image/png",
  "image/jpeg",
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
  const allowedTypes = consumer === "REPORT" ? REPORT_TYPES : ARTIFACT_TYPES;
  const maxSize = consumer === "REPORT" ? 25 * 1024 * 1024 : 1024 ** 3;
  const expectedPurpose: FilePurpose = consumer === "REPORT" ? "REPORT" : "ARTIFACT";
  if (
    originalName.length < 1 ||
    originalName.length > 255 ||
    input.purpose !== expectedPurpose ||
    !allowedTypes.has(input.contentType) ||
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > maxSize ||
    !/^[0-9a-f]{64}$/.test(input.sha256)
  ) {
    throw new InvalidUploadError();
  }
  return { ...input, consumer, originalName };
}
