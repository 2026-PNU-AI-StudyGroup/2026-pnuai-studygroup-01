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
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((value, index) => bytes[index] === value);
  }
  return bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}
