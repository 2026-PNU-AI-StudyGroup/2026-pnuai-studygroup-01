import { createHash, randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import { uploadService } from "@/app/api/uploads/_lib/upload-service";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

async function main() {
  const actor = { id: randomUUID(), role: "ADMIN" as const };
  const bytes = Buffer.from("announcement attachment smoke");
  const digest = createHash("sha256").update(bytes).digest();
  const checksum = digest.toString("base64");
  let objectKey = "";

  try {
    await prisma.user.create({ data: { id: actor.id, name: "Attachment Smoke", email: `${actor.id}@example.test`, role: actor.role } });
    const upload = await uploadService().create(actor, {
      purpose: "ANNOUNCEMENT",
      consumer: "ANNOUNCEMENT",
      originalName: "smoke.unrestricted-extension",
      contentType: "application/octet-stream",
      size: bytes.length,
      sha256: digest.toString("hex"),
    });
    const put = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream", "x-amz-checksum-sha256": checksum },
      body: bytes,
    });
    if (!put.ok) throw new Error(`PUT failed: ${put.status}`);
    await uploadService().complete(actor, upload.uploadId);

    const service = new AnnouncementService(new PrismaAnnouncementRepository(prisma));
    const announcement = await service.create(
      actor,
      { role: actor.role, actorId: actor.id, teamIds: [], programIds: [] },
      {
        title: "Attachment smoke",
        content: "Attachment smoke body",
        visibility: "AUTHENTICATED",
        pinned: false,
        teamId: null,
        programId: null,
        retainedAttachmentIds: [],
        newAttachmentUploadIds: [upload.uploadId],
      },
    );
    if (announcement.attachments[0]?.originalName !== "smoke.unrestricted-extension") {
      throw new Error("attachment was not returned from announcement query");
    }
    const stored = await prisma.storedFile.findUniqueOrThrow({ where: { id: upload.uploadId }, select: { objectKey: true, status: true } });
    objectKey = stored.objectKey;
    if (stored.status !== "ATTACHED") throw new Error(`unexpected status: ${stored.status}`);
    const downloaded = await s3.send(new GetObjectCommand({
      Bucket: objectStorageBucket,
      Key: objectKey,
      ResponseContentDisposition: "attachment; filename=smoke.unrestricted-extension",
    }));
    if (!Buffer.from(await downloaded.Body!.transformToByteArray()).equals(bytes)) throw new Error("downloaded bytes differ");

    await service.delete(actor, announcement.id);
    if (await prisma.storedFile.count({ where: { id: upload.uploadId } }) !== 0) throw new Error("deleted attachment file row remains");
    await uploadService().cleanup(new Date(Date.now() + 27 * 60 * 60_000));
    try {
      await s3.send(new HeadObjectCommand({ Bucket: objectStorageBucket, Key: objectKey }));
      throw new Error("deleted attachment object remains");
    } catch (error) {
      if (error instanceof Error && error.message === "deleted attachment object remains") throw error;
    }
    console.log("announcement attachment smoke passed");
  } finally {
    await prisma.announcement.deleteMany({ where: { authorId: actor.id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: actor.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
