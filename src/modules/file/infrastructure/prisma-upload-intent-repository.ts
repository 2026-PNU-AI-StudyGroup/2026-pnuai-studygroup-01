import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { randomUUID } from "node:crypto";
import type {
  UploadIntent,
  UploadIntentRepository,
} from "@/modules/file/application/manage-upload";
import type { FilePurpose } from "@/modules/file/domain/upload-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class PrismaUploadIntentRepository implements UploadIntentRepository {
  constructor(private readonly client: PrismaClient) {}

  createForActor(input: UploadIntent & {
    teamId: string;
    actor: CurrentActor;
    purpose: FilePurpose;
    originalName: string;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${input.actor.id}, 1))
      `);
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtextextended(${input.teamId}, 0))
      `);
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "team"."id"
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN' OR
            (${input.actor.role}::"UserRole" = 'STUDENT' AND EXISTS (
              SELECT 1 FROM "team_member"
              WHERE "team_member"."teamId" = "team"."id"
                AND "team_member"."studentId" = ${input.actor.id}
            ))
          )
        FOR UPDATE
      `);
      if (teams.length !== 1) return false;
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "stored_file" (
          "id", "teamId", "ownerId", "purpose", "status", "objectKey",
          "uploadObjectKey", "originalName", "contentType", "size", "sha256",
          "expiresAt", "cleanupAfter", "createdAt"
        )
        SELECT ${input.id}, "team"."id", ${input.actor.id},
          ${input.purpose}::"FilePurpose", 'PENDING'::"StoredFileStatus",
          ${input.objectKey}, ${input.uploadObjectKey}, ${input.originalName},
          ${input.contentType}, ${input.size}, ${input.sha256}, ${input.expiresAt},
          ${input.cleanupAfter}, ${new Date()}
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND (
            SELECT count(*) FROM "stored_file"
            WHERE "ownerId" = ${input.actor.id} AND "status" = 'PENDING'
          ) < 3
          AND COALESCE((
            SELECT sum("size") FROM "stored_file"
            WHERE "teamId" = "team"."id"
          ), 0) + ${input.size} <= 5368709120
        RETURNING "id"
      `);
      return rows.length === 1;
    });
  }

  async findPendingForOwner(id: string, ownerId: string): Promise<UploadIntent | null> {
    return this.client.storedFile.findFirst({
      where: { id, ownerId, status: "PENDING" },
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
  }

  isCompletedForOwner(id: string, ownerId: string): Promise<boolean> {
    return this.client.storedFile.count({
      where: { id, ownerId, status: { in: ["READY", "ATTACHED"] } },
    }).then((count) => count === 1);
  }

  finalizeWithTeamLock(
    id: string,
    ownerId: string,
    readyAt: Date,
    promote: (intent: UploadIntent) => Promise<void>,
  ): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const files = await transaction.$queryRaw<Array<UploadIntent>>(Prisma.sql`
        SELECT "stored_file"."id", "stored_file"."objectKey",
          "stored_file"."uploadObjectKey", "stored_file"."contentType",
          "stored_file"."size", "stored_file"."sha256",
          "stored_file"."expiresAt", "stored_file"."cleanupAfter"
        FROM "stored_file"
        JOIN "team" ON "team"."id" = "stored_file"."teamId"
        WHERE "stored_file"."id" = ${id}
          AND "stored_file"."ownerId" = ${ownerId}
          AND "stored_file"."status" = 'PENDING'
          AND "team"."status" <> 'CLOSED'
        FOR UPDATE OF "team", "stored_file"
      `);
      const file = files[0];
      if (!file) return false;
      await promote(file);
      await transaction.storedFile.update({
        where: { id },
        data: { status: "READY", readyAt },
      });
      await transaction.objectDeletionJob.upsert({
        where: { objectKey: file.uploadObjectKey },
        create: {
          id: randomUUID(),
          objectKey: file.uploadObjectKey,
          nextAttemptAt: file.cleanupAfter,
        },
        update: { nextAttemptAt: file.cleanupAfter, lockedAt: null },
      });
      return true;
    }, { timeout: 30_000 });
  }

  async deletePending(id: string, ownerId: string): Promise<void> {
    await this.client.storedFile.deleteMany({ where: { id, ownerId, status: "PENDING" } });
  }

  async deleteExpiredPending(now: Date, limit: number): Promise<void> {
    await this.client.$executeRaw(Prisma.sql`
      DELETE FROM "stored_file"
      WHERE "id" IN (
        SELECT "id" FROM "stored_file"
        WHERE "status" = 'PENDING' AND "cleanupAfter" <= ${now}
        ORDER BY "cleanupAfter" ASC
        LIMIT ${limit}
      )
    `);
  }

  async deleteExpiredReady(readyBefore: Date, limit: number): Promise<void> {
    await this.client.$executeRaw(Prisma.sql`
      DELETE FROM "stored_file"
      WHERE "id" IN (
        SELECT "id" FROM "stored_file"
        WHERE "status" = 'READY' AND "readyAt" <= ${readyBefore}
        ORDER BY "readyAt" ASC
        LIMIT ${limit}
      )
    `);
  }

  claimDeletionJobs(now: Date, limit: number): Promise<Array<{ objectKey: string; attempts: number }>> {
    const staleLock = new Date(now.getTime() - 5 * 60_000);
    return this.client.$queryRaw(Prisma.sql`
      UPDATE "object_deletion_job"
      SET "lockedAt" = ${now}
      WHERE "id" IN (
        SELECT "id" FROM "object_deletion_job"
        WHERE "nextAttemptAt" <= ${now}
          AND ("lockedAt" IS NULL OR "lockedAt" <= ${staleLock})
        ORDER BY "nextAttemptAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "objectKey", "attempts"
    `);
  }

  async completeDeletion(objectKey: string): Promise<void> {
    await this.client.objectDeletionJob.deleteMany({ where: { objectKey } });
  }

  async failDeletion(objectKey: string, error: string, nextAttemptAt: Date): Promise<void> {
    await this.client.objectDeletionJob.updateMany({
      where: { objectKey },
      data: {
        attempts: { increment: 1 },
        lastError: error,
        nextAttemptAt,
        lockedAt: null,
      },
    });
  }
}
