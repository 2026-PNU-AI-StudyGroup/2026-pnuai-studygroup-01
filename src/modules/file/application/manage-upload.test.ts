import { describe, expect, it, vi } from "vitest";

import {
  type ObjectStorage,
  type UploadIntentRepository,
  UploadNotFoundError,
  UploadService,
} from "@/modules/file/application/manage-upload";

function dependencies() {
  const repository: UploadIntentRepository = {
    createForActor: vi.fn(async () => true),
    findPendingForOwner: vi.fn(),
    isCompletedForOwner: vi.fn(async () => false),
    finalizeWithTeamLock: vi.fn(async (_id, _ownerId, _readyAt, promote) => {
      await promote({
        id: "upload-1",
        objectKey: "teams/team-1/files/upload-1",
        uploadObjectKey: "staging/team-1/upload-1",
        contentType: "application/pdf",
        size: 100,
        sha256: "a".repeat(64),
        expiresAt: new Date("2026-01-02T00:00:00Z"),
        cleanupAfter: new Date("2026-01-03T00:00:00Z"),
      });
      return true;
    }),
    deletePending: vi.fn(async () => undefined),
    deleteExpiredPending: vi.fn(async () => undefined),
    deleteExpiredReady: vi.fn(async () => undefined),
    claimDeletionJobs: vi.fn(async () => []),
    completeDeletion: vi.fn(async () => undefined),
    failDeletion: vi.fn(async () => undefined),
  };
  const storage: ObjectStorage = {
    createUploadUrl: vi.fn(async () => ({
      url: "http://minio/upload",
      expiresAt: new Date("2026-01-01T00:15:00Z"),
    })),
    inspect: vi.fn(),
    remove: vi.fn(async () => undefined),
    promote: vi.fn(async () => undefined),
  };
  return { repository, storage };
}

describe("파일 업로드", () => {
  it("권한 있는 팀원의 업로드 의도를 만들고 URL을 발급한다", async () => {
    const deps = dependencies();
    const service = new UploadService(deps.repository, deps.storage);
    const result = await service.create(
      { id: "student-1", role: "STUDENT" },
      {
        teamId: "team-1",
        purpose: "REPORT",
        originalName: "report.pdf",
        contentType: "application/pdf",
        size: 100,
        sha256: "a".repeat(64),
      },
      new Date("2026-01-01T00:00:00Z"),
    );
    expect(result.uploadUrl).toBe("http://minio/upload");
    expect(deps.repository.createForActor).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: "student-1", role: "STUDENT" },
        objectKey: expect.stringMatching(/^teams\/team-1\/files\//),
        uploadObjectKey: expect.stringMatching(/^staging\/team-1\//),
      }),
    );
  });

  it("이미 완료된 동일 소유자의 재시도를 성공으로 처리한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.isCompletedForOwner).mockResolvedValue(true);
    const service = new UploadService(deps.repository, deps.storage);

    await expect(
      service.complete(
        { id: "student-1", role: "STUDENT" },
        "upload-1",
      ),
    ).resolves.toEqual({ uploadId: "upload-1" });
    expect(deps.storage.inspect).not.toHaveBeenCalled();
  });

  it("실제 파일 메타데이터가 다르면 예약을 유지하고 완료를 거부한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.findPendingForOwner).mockResolvedValue({
      id: "upload-1",
      objectKey: "teams/team-1/files/upload-1",
      uploadObjectKey: "staging/team-1/upload-1",
      contentType: "application/pdf",
      size: 100,
      sha256: "a".repeat(64),
      expiresAt: new Date("2026-01-02T00:00:00Z"),
      cleanupAfter: new Date("2026-01-03T00:00:00Z"),
    });
    vi.mocked(deps.storage.inspect).mockResolvedValue({
      contentType: "application/pdf",
      size: 99,
      sha256: "a".repeat(64),
    });
    const service = new UploadService(deps.repository, deps.storage);

    await expect(
      service.complete(
        { id: "student-1", role: "STUDENT" },
        "upload-1",
        new Date("2026-01-01T00:00:00Z"),
      ),
    ).rejects.toBeInstanceOf(UploadNotFoundError);
    expect(deps.storage.remove).not.toHaveBeenCalled();
    expect(deps.repository.deletePending).not.toHaveBeenCalled();
  });

  it("만료 예약과 24시간 동안 첨부되지 않은 완료 파일을 정리한다", async () => {
    const deps = dependencies();
    const service = new UploadService(deps.repository, deps.storage);
    const now = new Date("2026-01-03T00:00:00Z");

    await service.cleanup(now);

    expect(deps.repository.deleteExpiredPending).toHaveBeenCalledWith(now, 100);
    expect(deps.repository.deleteExpiredReady).toHaveBeenCalledWith(
      new Date("2026-01-02T00:00:00Z"),
      100,
    );
  });
});
