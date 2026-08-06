import { UploadService } from "@/modules/file/application/manage-upload";
import { ProfileImageService } from "@/modules/identity/application/manage-profile-image";
import { PrismaProfileImageRepository } from "@/modules/identity/infrastructure/prisma-profile-image-repository";
import { PrismaUploadIntentRepository } from "@/modules/file/infrastructure/prisma-upload-intent-repository";
import { S3ObjectStorage } from "@/modules/file/infrastructure/s3-object-storage";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

const cleanupIntervalMs = 15 * 60_000;

const workerGlobal = globalThis as typeof globalThis & {
  pmsUploadCleanupTimer?: ReturnType<typeof setInterval>;
};

function cleanupService(): UploadService {
  return new UploadService(
    new PrismaUploadIntentRepository(prisma),
    new S3ObjectStorage(s3, objectStorageBucket),
  );
}

function profileImageCleanupService(): ProfileImageService {
  return new ProfileImageService(
    new PrismaProfileImageRepository(prisma),
    new S3ObjectStorage(s3, objectStorageBucket),
  );
}

async function runCleanup(): Promise<void> {
  try {
    await profileImageCleanupService().cleanupExpired();
    await cleanupService().cleanup();
  } catch (error) {
    console.error("업로드 정리 작업에 실패했습니다.", error);
  }
}

export function startUploadCleanupWorker(): void {
  if (workerGlobal.pmsUploadCleanupTimer) return;
  void runCleanup();
  const timer = setInterval(() => void runCleanup(), cleanupIntervalMs);
  timer.unref();
  workerGlobal.pmsUploadCleanupTimer = timer;
}
