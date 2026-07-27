import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ArtifactWriter } from "@/modules/report/application/report-ports";
import type { ArtifactType } from "@/modules/report/domain/report-policy";

export class PrismaArtifactRepository implements ArtifactWriter {
  constructor(private readonly client: PrismaClient) {}

  registerArtifact(input: {
    teamId: string;
    actor: CurrentActor;
    type: ArtifactType;
    title: string;
    fileId?: string;
    externalUrl?: string;
    createdAt: Date;
  }): Promise<{ id: string } | null> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "team"."id"
        FROM "team"
        JOIN "topic" ON "topic"."id" = "team"."topicId"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" = 'CONFIRMED'
          AND (
            ${input.actor.role}::"UserRole" = 'ADMIN'
            OR (
              EXISTS (
                SELECT 1 FROM "team_member"
                WHERE "teamId" = "team"."id" AND "studentId" = ${input.actor.id}
              )
              AND ${input.createdAt} BETWEEN "topic"."submissionStartsAt" AND "topic"."submissionEndsAt"
            )
          )
        FOR UPDATE OF "team"
      `);
      if (authorized.length !== 1) return null;
      if (input.fileId) {
        const files = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id" FROM "stored_file"
          WHERE "id" = ${input.fileId}
            AND "teamId" = ${input.teamId}
            AND "ownerId" = ${input.actor.id}
            AND "purpose" = 'ARTIFACT'
            AND "status" = 'READY'
          FOR UPDATE
        `);
        if (files.length !== 1) return null;
      }
      return transaction.artifact.create({
        data: {
          id: randomUUID(),
          teamId: input.teamId,
          registeredById: input.actor.id,
          type: input.type,
          title: input.title,
          fileId: input.fileId,
          externalUrl: input.externalUrl,
          createdAt: input.createdAt,
        },
        select: { id: true },
      });
    });
  }
}
