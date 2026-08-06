import { describe, expect, it, vi } from "vitest";

import {
  type ProfileImageRepository,
  type ProfileImageStorage,
  ProfileImageNotFoundError,
  ProfileImageService,
} from "@/modules/identity/application/manage-profile-image";

const actor = { id: "student-1", role: "STUDENT" as const };
const now = new Date("2026-08-07T00:00:00Z");
const intent = {
  id: "upload-1",
  objectKey: "profile-images/student-1/upload-1",
  uploadObjectKey: "staging/profile-images/student-1/upload-1",
  contentType: "image/png" as const,
  size: 100,
  sha256: "a".repeat(64),
  expiresAt: new Date("2026-08-07T00:15:00Z"),
  cleanupAfter: new Date("2026-08-08T02:15:00Z"),
};

function dependencies() {
  const repository: ProfileImageRepository = {
    createUploadForOwner: vi.fn(async () => true),
    findPendingForOwner: vi.fn(),
    isCompletedForOwner: vi.fn(async () => false),
    finalizeForOwner: vi.fn(async (_id, _ownerId, _completedAt, promote) => {
      await promote(intent);
      return true;
    }),
    removeForOwner: vi.fn(async () => true),
    findForOwner: vi.fn(async () => null),
    findVisibleForActor: vi.fn(async () => null),
    deleteExpiredPending: vi.fn(async () => undefined),
  };
  const storage: ProfileImageStorage = {
    createUploadUrl: vi.fn(async () => ({ url: "https://storage.invalid/upload", expiresAt: intent.expiresAt })),
    inspect: vi.fn(async () => ({ contentType: "image/png", size: 100, sha256: "a".repeat(64) })),
    readPrefix: vi.fn(async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    promote: vi.fn(async () => undefined),
  };
  return { repository, storage };
}

describe("프로필 사진 관리", () => {
  it("사용자 전용 staging/final key로 업로드 intent를 만든다", async () => {
    const deps = dependencies();
    const result = await new ProfileImageService(deps.repository, deps.storage).create(actor, {
      originalName: "photo.png",
      contentType: "image/png",
      size: 100,
      sha256: "a".repeat(64),
    }, now);

    expect(result.uploadUrl).toBe("https://storage.invalid/upload");
    expect(deps.repository.createUploadForOwner).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      objectKey: expect.stringMatching(/^profile-images\/student-1\//),
      uploadObjectKey: expect.stringMatching(/^staging\/profile-images\/student-1\//),
    }));
  });

  it("metadata와 매직 바이트를 재검증한 뒤에만 사진을 연결한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.findPendingForOwner).mockResolvedValue(intent);
    const service = new ProfileImageService(deps.repository, deps.storage);

    await expect(service.complete(actor, intent.id, now)).resolves.toEqual({ uploadId: intent.id });
    expect(deps.storage.promote).toHaveBeenCalledWith(intent.uploadObjectKey, intent.objectKey);
    expect(deps.storage.inspect).toHaveBeenCalledTimes(2);
    expect(deps.storage.readPrefix).toHaveBeenCalledTimes(2);
  });

  it("매직 바이트가 MIME과 다르면 intent 완료를 거부한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.findPendingForOwner).mockResolvedValue(intent);
    vi.mocked(deps.storage.readPrefix).mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff]));

    await expect(new ProfileImageService(deps.repository, deps.storage).complete(actor, intent.id, now))
      .rejects.toBeInstanceOf(ProfileImageNotFoundError);
    expect(deps.repository.finalizeForOwner).not.toHaveBeenCalled();
  });

  it("만료 intent를 완료하지 않고 cleanup 대상에 넣는다", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.findPendingForOwner).mockResolvedValue({ ...intent, expiresAt: now });
    const service = new ProfileImageService(deps.repository, deps.storage);

    await expect(service.complete(actor, intent.id, now)).rejects.toBeInstanceOf(ProfileImageNotFoundError);
    await service.cleanupExpired(now);
    expect(deps.repository.deleteExpiredPending).toHaveBeenCalledWith(now, 100);
  });

  it("사진 삭제는 소유자 메타데이터 제거 경로만 호출한다", async () => {
    const deps = dependencies();
    await expect(new ProfileImageService(deps.repository, deps.storage).remove(actor, now)).resolves.toBe(true);
    expect(deps.repository.removeForOwner).toHaveBeenCalledWith("student-1", now);
  });
});
