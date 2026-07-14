import "dotenv/config";

import { UploadService } from "../src/modules/file/application/manage-upload";
import { PrismaUploadIntentRepository } from "../src/modules/file/infrastructure/prisma-upload-intent-repository";
import { S3ObjectStorage } from "../src/modules/file/infrastructure/s3-object-storage";
import { prisma } from "../src/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "../src/shared/infrastructure/object-storage/s3";

async function main() {
  const service = new UploadService(
    new PrismaUploadIntentRepository(prisma),
    new S3ObjectStorage(s3, objectStorageBucket),
  );
  await service.cleanup();
  console.log("만료 업로드와 객체 삭제 Outbox 처리를 완료했습니다.");
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
