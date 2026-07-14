export type FilePurpose = "REPORT" | "ARTIFACT";

const REPORT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ARTIFACT_TYPES = new Set([
  ...REPORT_TYPES,
  "application/zip",
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
  originalName: string;
  contentType: string;
  size: number;
  sha256: string;
}) {
  const originalName = input.originalName.trim();
  const allowedTypes = input.purpose === "REPORT" ? REPORT_TYPES : ARTIFACT_TYPES;
  const maxSize = input.purpose === "REPORT" ? 25 * 1024 * 1024 : 1024 ** 3;
  if (
    originalName.length < 1 ||
    originalName.length > 255 ||
    !allowedTypes.has(input.contentType) ||
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > maxSize ||
    !/^[0-9a-f]{64}$/.test(input.sha256)
  ) {
    throw new InvalidUploadError();
  }
  return { ...input, originalName };
}
