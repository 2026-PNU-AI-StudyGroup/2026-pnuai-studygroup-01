import { describe, expect, it } from "vitest";

import {
  hasProfileImageMagicBytes,
  InvalidProfileImageError,
  PROFILE_IMAGE_MAX_BYTES,
  validateProfileImageUpload,
} from "@/modules/identity/domain/profile-image-policy";

const valid = {
  originalName: " photo.webp ",
  contentType: "image/webp",
  size: 1024,
  sha256: "a".repeat(64),
};

describe("프로필 사진 업로드 정책", () => {
  it("허용 형식과 무결성 정보를 정규화한다", () => {
    expect(validateProfileImageUpload(valid)).toEqual({ ...valid, originalName: "photo.webp" });
  });

  it.each([
    { ...valid, contentType: "image/svg+xml" },
    { ...valid, contentType: "image/gif" },
    { ...valid, size: PROFILE_IMAGE_MAX_BYTES + 1 },
    { ...valid, sha256: "not-a-checksum" },
  ])("허용하지 않는 사진 입력을 거부한다", (input) => {
    expect(() => validateProfileImageUpload(input)).toThrow(InvalidProfileImageError);
  });

  it("서버가 MIME별 파일 매직 바이트를 확인한다", () => {
    expect(hasProfileImageMagicBytes("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(hasProfileImageMagicBytes("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(hasProfileImageMagicBytes("image/webp", new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe(true);
    expect(hasProfileImageMagicBytes("image/png", new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  });
});
