import "dotenv/config";
import path from "node:path";

import { CreateYearlyBackupService } from "@/modules/backup/application/create-yearly-backup";
import { FilesystemYearlyBackupWriter } from "@/modules/backup/infrastructure/filesystem-yearly-backup-writer";
import { PrismaYearlyBackupCatalog } from "@/modules/backup/infrastructure/prisma-yearly-backup-catalog";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

const academicYear = Number(process.argv[2]);
const outputRoot = path.resolve(process.argv[3] ?? "backups");

async function main() {
  try {
    const result = await new CreateYearlyBackupService(
      new PrismaYearlyBackupCatalog(prisma),
      new FilesystemYearlyBackupWriter(s3, objectStorageBucket, outputRoot),
    ).execute(academicYear);
    console.log(JSON.stringify(result));
  } finally {
    s3.destroy();
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
