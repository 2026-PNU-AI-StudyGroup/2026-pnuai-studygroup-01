import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cleanup, cleanupProfileImages } = vi.hoisted(() => ({
  cleanup: vi.fn(async () => undefined),
  cleanupProfileImages: vi.fn(async () => undefined),
}));

vi.mock("@/modules/file/application/manage-upload", () => ({
  UploadService: class {
    cleanup = cleanup;
  },
}));
vi.mock("@/modules/identity/application/manage-profile-image", () => ({
  ProfileImageService: class {
    cleanupExpired = cleanupProfileImages;
  },
}));
vi.mock("@/modules/identity/infrastructure/prisma-profile-image-repository", () => ({
  PrismaProfileImageRepository: class {},
}));
vi.mock("@/modules/file/infrastructure/prisma-upload-intent-repository", () => ({
  PrismaUploadIntentRepository: class {},
}));
vi.mock("@/modules/file/infrastructure/s3-object-storage", () => ({
  S3ObjectStorage: class {},
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/infrastructure/object-storage/s3", () => ({ objectStorageBucket: "test", s3: {} }));

import { startUploadCleanupWorker } from "@/modules/file/infrastructure/upload-cleanup-worker";

const workerGlobal = globalThis as typeof globalThis & {
  pmsUploadCleanupTimer?: ReturnType<typeof setInterval>;
};

describe("업로드 정리 worker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cleanup.mockClear();
    cleanupProfileImages.mockClear();
    delete workerGlobal.pmsUploadCleanupTimer;
  });

  afterEach(() => {
    if (workerGlobal.pmsUploadCleanupTimer) clearInterval(workerGlobal.pmsUploadCleanupTimer);
    delete workerGlobal.pmsUploadCleanupTimer;
    vi.useRealTimers();
  });

  it("즉시 한 번 실행하고 중복 timer 없이 15분마다 정리한다", async () => {
    startUploadCleanupWorker();
    startUploadCleanupWorker();
    await Promise.resolve();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanupProfileImages).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(15 * 60_000);
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(cleanupProfileImages).toHaveBeenCalledTimes(2);
  });
});
