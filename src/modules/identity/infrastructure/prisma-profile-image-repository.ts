import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ProfileImageRecord,
  ProfileImageRepository,
  ProfileImageUploadIntent,
} from "@/modules/identity/application/manage-profile-image";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ProfileImageContentType } from "@/modules/identity/domain/profile-image-policy";
import { teamActorWhere } from "@/modules/team/infrastructure/prisma-team-workspace-authorization";

type StoredProfileImage = Omit<ProfileImageRecord, "contentType"> & { contentType: string };

function toProfileImage(record: StoredProfileImage): ProfileImageRecord {
  return { ...record, contentType: record.contentType as ProfileImageContentType };
}

export class PrismaProfileImageRepository implements ProfileImageRepository {
  constructor(private readonly client: PrismaClient) {}

  async createUploadForOwner(input: ProfileImageUploadIntent & { ownerId: string; originalName: string }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${input.ownerId}, 1))
      `);
      const pendingCount = await transaction.profileImageUpload.count({
        where: { ownerId: input.ownerId },
      });
      if (pendingCount >= 3) return false;
      await transaction.profileImageUpload.create({
        data: {
          id: input.id,
          ownerId: input.ownerId,
          objectKey: input.objectKey,
          uploadObjectKey: input.uploadObjectKey,
          originalName: input.originalName,
          contentType: input.contentType,
          size: input.size,
          sha256: input.sha256,
          expiresAt: input.expiresAt,
          cleanupAfter: input.cleanupAfter,
        },
      });
      return true;
    });
  }

  async findPendingForOwner(id: string, ownerId: string): Promise<ProfileImageUploadIntent | null> {
    const record = await this.client.profileImageUpload.findFirst({
      where: { id, ownerId },
      select: {
        id: true,
        objectKey: true,
        uploadObjectKey: true,
        contentType: true,
        size: true,
        sha256: true,
        expiresAt: true,
        cleanupAfter: true,
      },
    });
    return record ? { ...record, contentType: record.contentType as ProfileImageContentType } : null;
  }

  async isCompletedForOwner(id: string, ownerId: string): Promise<boolean> {
    const profileImage = await this.client.userProfileImage.findUnique({
      where: { userId: ownerId },
      select: { objectKey: true },
    });
    return profileImage?.objectKey === `profile-images/${ownerId}/${id}`;
  }

  async finalizeForOwner(
    id: string,
    ownerId: string,
    completedAt: Date,
    promote: (intent: ProfileImageUploadIntent) => Promise<void>,
  ): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}, 1))
      `);
      const intents = await transaction.$queryRaw<Array<{
        id: string;
        objectKey: string;
        uploadObjectKey: string;
        contentType: string;
        size: number;
        sha256: string;
        expiresAt: Date;
        cleanupAfter: Date;
      }>>(Prisma.sql`
        SELECT "id", "objectKey", "uploadObjectKey", "contentType", "size", "sha256", "expiresAt", "cleanupAfter"
        FROM "profile_image_upload"
        WHERE "id" = ${id}
          AND "ownerId" = ${ownerId}
          AND "expiresAt" > ${completedAt}
        FOR UPDATE
      `);
      const storedIntent = intents[0];
      if (!storedIntent) return false;
      const intent: ProfileImageUploadIntent = {
        ...storedIntent,
        contentType: storedIntent.contentType as ProfileImageContentType,
      };
      await promote(intent);
      const previous = await transaction.userProfileImage.findUnique({
        where: { userId: ownerId },
        select: { objectKey: true },
      });
      await transaction.userProfileImage.upsert({
        where: { userId: ownerId },
        create: {
          userId: ownerId,
          objectKey: intent.objectKey,
          contentType: intent.contentType,
          size: intent.size,
          sha256: intent.sha256,
        },
        update: {
          objectKey: intent.objectKey,
          contentType: intent.contentType,
          size: intent.size,
          sha256: intent.sha256,
          updatedAt: completedAt,
        },
      });
      await transaction.profileImageUpload.delete({ where: { id } });
      await transaction.objectDeletionJob.upsert({
        where: { objectKey: intent.uploadObjectKey },
        create: {
          id: randomUUID(),
          objectKey: intent.uploadObjectKey,
          nextAttemptAt: intent.cleanupAfter,
        },
        update: { nextAttemptAt: intent.cleanupAfter, lockedAt: null },
      });
      if (previous && previous.objectKey !== intent.objectKey) {
        await transaction.objectDeletionJob.upsert({
          where: { objectKey: previous.objectKey },
          create: {
            id: randomUUID(),
            objectKey: previous.objectKey,
            nextAttemptAt: completedAt,
          },
          update: { nextAttemptAt: completedAt, lockedAt: null },
        });
      }
      return true;
    }, { timeout: 30_000 });
  }

  async removeForOwner(ownerId: string, deletedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}, 1))
      `);
      const image = await transaction.userProfileImage.findUnique({
        where: { userId: ownerId },
        select: { objectKey: true },
      });
      if (!image) return false;
      await transaction.userProfileImage.delete({ where: { userId: ownerId } });
      await transaction.objectDeletionJob.upsert({
        where: { objectKey: image.objectKey },
        create: { id: randomUUID(), objectKey: image.objectKey, nextAttemptAt: deletedAt },
        update: { nextAttemptAt: deletedAt, lockedAt: null },
      });
      return true;
    });
  }

  async findForOwner(ownerId: string): Promise<Pick<ProfileImageRecord, "updatedAt"> | null> {
    return this.client.userProfileImage.findUnique({
      where: { userId: ownerId },
      select: { updatedAt: true },
    });
  }

  async findVisibleForActor(userId: string, actor: CurrentActor): Promise<ProfileImageRecord | null> {
    const select = {
      userId: true,
      objectKey: true,
      contentType: true,
      size: true,
      sha256: true,
      updatedAt: true,
    } as const;
    if (actor.id === userId || actor.role === "ADMIN") {
      const image = await this.client.userProfileImage.findUnique({ where: { userId }, select });
      return image ? toProfileImage(image) : null;
    }
    const image = await this.client.userProfileImage.findFirst({
      where: {
        userId,
        user: {
          OR: [
            {
              projectTeamMemberships: {
                some: { projectTeam: teamActorWhere(actor) },
              },
            },
            {
              topicsManaged: {
                some: { projectTeam: { is: teamActorWhere(actor) } },
              },
            },
            {
              projectAssistantMemberships: {
                some: {
                  topic: { projectTeam: { is: teamActorWhere(actor) } },
                },
              },
            },
          ],
        },
      },
      select,
    });
    return image ? toProfileImage(image) : null;
  }

  async deleteExpiredPending(now: Date, limit: number): Promise<void> {
    const expired = await this.client.profileImageUpload.findMany({
      where: { cleanupAfter: { lte: now } },
      orderBy: { cleanupAfter: "asc" },
      take: limit,
      select: { id: true, uploadObjectKey: true },
    });
    await this.client.$transaction(async (transaction) => {
      for (const intent of expired) {
        const deleted = await transaction.profileImageUpload.deleteMany({
          where: { id: intent.id, cleanupAfter: { lte: now } },
        });
        if (deleted.count !== 1) continue;
        await transaction.objectDeletionJob.upsert({
          where: { objectKey: intent.uploadObjectKey },
          create: { id: randomUUID(), objectKey: intent.uploadObjectKey, nextAttemptAt: now },
          update: { nextAttemptAt: now, lockedAt: null },
        });
      }
    });
  }
}
