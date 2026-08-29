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
// 브라우저가 같은 파일에 다른 MIME 타입을 보고한다. Windows 의 Chrome·Edge 는 레지스트리
// (HKCR\.zip 의 Content Type) 를 따라 .zip 을 application/x-zip-compressed 로 준다.
// 허용 목록에 application/zip 만 있어서 Windows 학생은 소스 코드 zip 을 아예 올릴 수 없었고,
// 오류 문구가 용량을 지목해 원인을 오해하게 만들었다.
//
// 검사 전에 표준 타입으로 바꾼다. 반환값도 정규화된 타입이라 저장·내려보내기까지 한 가지로
// 통일된다. 확장자는 보지 않는다 — 이름을 믿는 순간 다른 문제가 생긴다.
const CONTENT_TYPE_ALIASES = new Map([
  ["application/x-zip-compressed", "application/zip"],
  ["application/x-zip", "application/zip"],
  ["image/jpg", "image/jpeg"],
]);

export function normalizeUploadContentType(contentType: string): string {
  const trimmed = contentType.trim().toLowerCase();
  return CONTENT_TYPE_ALIASES.get(trimmed) ?? trimmed;
}

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
  const contentType = normalizeUploadContentType(input.contentType) || "application/octet-stream";
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
