import { ProfileImageService } from "@/modules/identity/application/manage-profile-image";
import { PrismaProfileImageRepository } from "@/modules/identity/infrastructure/prisma-profile-image-repository";
import { S3ObjectStorage } from "@/modules/file/infrastructure/s3-object-storage";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export function profileImageService(): ProfileImageService {
  return new ProfileImageService(
    new PrismaProfileImageRepository(prisma),
    new S3ObjectStorage(s3, objectStorageBucket),
  );
}
