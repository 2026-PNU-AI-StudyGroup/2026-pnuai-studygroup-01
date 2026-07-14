import { UploadService } from "@/modules/file/application/manage-upload";
import { PrismaUploadIntentRepository } from "@/modules/file/infrastructure/prisma-upload-intent-repository";
import { S3ObjectStorage } from "@/modules/file/infrastructure/s3-object-storage";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export function uploadService() {
  return new UploadService(
    new PrismaUploadIntentRepository(prisma),
    new S3ObjectStorage(s3, objectStorageBucket),
  );
}
