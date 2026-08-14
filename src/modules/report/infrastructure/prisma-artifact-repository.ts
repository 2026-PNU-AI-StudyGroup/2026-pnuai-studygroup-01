import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ArtifactWriter } from "@/modules/report/application/report-ports";
import type { ArtifactType } from "@/modules/report/domain/report-policy";

export class PrismaArtifactRepository implements ArtifactWriter {
  constructor(private readonly client: PrismaClient) {}

  private authorizeTeam(
    transaction: Prisma.TransactionClient,
    input: { teamId: string; actor: CurrentActor; at: Date },
  ) {
    return transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "project_team"."id"
      FROM "project_team"
      JOIN "topic" ON "topic"."id" = "project_team"."projectId"
      JOIN "project_program" ON "project_program"."id" = "topic"."programId"
      WHERE "project_team"."id" = ${input.teamId}
        AND "topic"."status" = 'ACTIVE'
        AND "project_team"."confirmedAt" IS NOT NULL
        AND (
          ${input.actor.role}::"UserRole" = 'ADMIN'
          OR (
            EXISTS (
              SELECT 1 FROM "project_team_membership"
              WHERE "projectTeamId" = "project_team"."id" AND "userId" = ${input.actor.id} AND "endedAt" IS NULL
            )
            AND ${input.at} BETWEEN "project_program"."submissionStartsAt" AND "project_program"."submissionEndsAt"
          )
        )
      FOR UPDATE OF "project_team"
    `);
  }

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
      const authorized = await this.authorizeTeam(transaction, {
        teamId: input.teamId,
        actor: input.actor,
        at: input.createdAt,
      });
      if (authorized.length !== 1) return null;
      if (input.fileId) {
        const files = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id" FROM "stored_file"
          WHERE "id" = ${input.fileId}
            AND "projectTeamId" = ${input.teamId}
            AND "ownerId" = ${input.actor.id}
            AND "purpose" = 'ARTIFACT'
            AND "consumer" = 'ARTIFACT'
            AND "status" = 'READY'
          FOR UPDATE
        `);
        if (files.length !== 1) return null;
      }
      return transaction.artifact.create({
        data: {
          id: randomUUID(),
          projectTeamId: input.teamId,
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

  updateArtifact(input: {
    artifactId: string;
    teamId: string;
    actor: CurrentActor;
    type: ArtifactType;
    title: string;
    updatedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await this.authorizeTeam(transaction, {
        teamId: input.teamId,
        actor: input.actor,
        at: input.updatedAt,
      });
      if (authorized.length !== 1) return false;
      const result = await transaction.artifact.updateMany({
        where: { id: input.artifactId, projectTeamId: input.teamId },
        data: { type: input.type, title: input.title },
      });
      return result.count === 1;
    });
  }

  removeArtifact(input: {
    artifactId: string;
    teamId: string;
    actor: CurrentActor;
    removedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await this.authorizeTeam(transaction, {
        teamId: input.teamId,
        actor: input.actor,
        at: input.removedAt,
      });
      if (authorized.length !== 1) return false;

      const artifacts = await transaction.$queryRaw<Array<{ fileId: string | null }>>(Prisma.sql`
        SELECT "fileId"
        FROM "artifact"
        WHERE "id" = ${input.artifactId} AND "projectTeamId" = ${input.teamId}
        FOR UPDATE
      `);
      const artifact = artifacts[0];
      if (!artifact || artifacts.length !== 1) return false;
      await transaction.artifact.delete({ where: { id: input.artifactId } });

      if (artifact.fileId) {
        const reportReferenceCount = await transaction.reportVersion.count({ where: { fileId: artifact.fileId } });
        if (reportReferenceCount === 0) {
          await transaction.storedFile.deleteMany({
            where: {
              id: artifact.fileId,
              projectTeamId: input.teamId,
              consumer: "ARTIFACT",
            },
          });
        }
      }
      return true;
    });
  }

  setThumbnail(input: {
    teamId: string;
    actor: CurrentActor;
    fileId: string | null;
    updatedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await this.authorizeTeam(transaction, {
        teamId: input.teamId,
        actor: input.actor,
        at: input.updatedAt,
      });
      if (authorized.length !== 1) return false;
      if (input.fileId) {
        // 대표 이미지는 아티팩트 행으로 연결되지 않으므로 attach 트리거가 동작하지 않는다.
        // 소유자·팀·용도·READY를 확인하는 동시에 직접 ATTACHED로 승격해 /api/files가 제공하고
        // 정리 작업이 삭제하지 않도록 한다.
        const attached = await transaction.$executeRaw(Prisma.sql`
          UPDATE "stored_file"
          SET "status" = 'ATTACHED'
          WHERE "id" = ${input.fileId}
            AND "projectTeamId" = ${input.teamId}
            AND "ownerId" = ${input.actor.id}
            AND "purpose" = 'ARTIFACT'
            AND "consumer" = 'ARTIFACT'
            AND "status" = 'READY'
        `);
        if (attached !== 1) return false;
      }
      await transaction.projectTeam.update({
        where: { id: input.teamId },
        data: { project: { update: { thumbnailPath: input.fileId ? `/api/files/${input.fileId}` : null } } },
      });
      return true;
    });
  }

  reorderArtifacts(input: {
    teamId: string;
    actor: CurrentActor;
    orderedIds: string[];
    reorderedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const authorized = await this.authorizeTeam(transaction, {
        teamId: input.teamId,
        actor: input.actor,
        at: input.reorderedAt,
      });
      if (authorized.length !== 1) return false;

      // 갤러리 순서는 IMAGE 아티팩트의 position으로 결정. 넘어온 순서 중 이 팀의 IMAGE만
      // 추린 뒤, 빠진 것은 기존 순서대로 뒤에 붙여 position을 0..n으로 다시 매긴다.
      const images = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "artifact"
        WHERE "projectTeamId" = ${input.teamId} AND "type" = 'IMAGE'
        ORDER BY "position" ASC, "createdAt" ASC
        FOR UPDATE
      `);
      const existing = images.map((image) => image.id);
      const known = input.orderedIds.filter((id) => existing.includes(id));
      const remaining = existing.filter((id) => !known.includes(id));
      const finalOrder = [...known, ...remaining];
      await Promise.all(
        finalOrder.map((id, position) =>
          transaction.artifact.update({ where: { id }, data: { position } }),
        ),
      );
      return true;
    });
  }
}
