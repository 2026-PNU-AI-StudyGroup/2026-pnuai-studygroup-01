import { detectRasterImageType } from "@/modules/file/domain/upload-policy";

export const PROFILE_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProfileImageContentType = (typeof PROFILE_IMAGE_CONTENT_TYPES)[number];

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export class InvalidProfileImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidProfileImageError";
  }
}

export function validateProfileImageUpload(input: {
  originalName: string;
  contentType: string;
  size: number;
  sha256: string;
}): {
  originalName: string;
  contentType: ProfileImageContentType;
  size: number;
  sha256: string;
} {
  const originalName = input.originalName.trim();
  if (!originalName || originalName.length > 255) {
    throw new InvalidProfileImageError("파일 이름을 확인해 주세요.");
  }
  if (!isProfileImageContentType(input.contentType)) {
    throw new InvalidProfileImageError("JPEG, PNG, WebP 이미지만 올릴 수 있습니다.");
  }
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new InvalidProfileImageError("사진은 5MiB 이하여야 합니다.");
  }
  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) {
    throw new InvalidProfileImageError("파일 무결성 정보를 확인할 수 없습니다.");
  }
  return {
    originalName,
    contentType: input.contentType,
    size: input.size,
    sha256: input.sha256.toLowerCase(),
  };
}

export function isProfileImageContentType(value: string): value is ProfileImageContentType {
  return (PROFILE_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export function hasProfileImageMagicBytes(
  contentType: ProfileImageContentType,
  bytes: Uint8Array,
): boolean {
  return detectRasterImageType(bytes) === contentType;
}
