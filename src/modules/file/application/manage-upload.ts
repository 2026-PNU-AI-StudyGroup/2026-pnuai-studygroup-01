import { randomUUID } from "node:crypto";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  type FilePurpose,
  type UploadConsumer,
  validateUpload,
} from "@/modules/file/domain/upload-policy";

export class UploadNotFoundError extends Error {
  constructor() {
    super("업로드 정보를 찾을 수 없습니다.");
    this.name = "UploadNotFoundError";
  }
}

export type UploadIntent = {
  id: string;
  objectKey: string;
  uploadObjectKey: string;
  contentType: string;
  size: number;
  sha256: string;
  expiresAt: Date;
  cleanupAfter: Date;
};

export interface UploadIntentRepository {
  createForActor(input: UploadIntent & {
    teamId: string | null;
    actor: CurrentActor;
    purpose: FilePurpose;
    consumer: UploadConsumer;
    originalName: string;
  }): Promise<boolean>;
  findPendingForOwner(id: string, ownerId: string): Promise<UploadIntent | null>;
  isCompletedForOwner(id: string, ownerId: string): Promise<boolean>;
  finalizeWithScopeLock(
    id: string,
    ownerId: string,
    readyAt: Date,
    promote: (intent: UploadIntent) => Promise<void>,
  ): Promise<boolean>;
  deletePending(id: string, ownerId: string): Promise<void>;
  deleteExpiredPending(now: Date, limit: number): Promise<void>;
  deleteExpiredReady(readyBefore: Date, limit: number): Promise<void>;
  claimDeletionJobs(now: Date, limit: number): Promise<Array<{ objectKey: string; attempts: number }>>;
  completeDeletion(objectKey: string): Promise<void>;
  failDeletion(objectKey: string, error: string, nextAttemptAt: Date): Promise<void>;
}

export interface ObjectStorage {
  createUploadUrl(input: UploadIntent): Promise<{ url: string; expiresAt: Date }>;
  inspect(objectKey: string): Promise<{
    contentType?: string;
    size?: number;
    sha256?: string;
  }>;
  remove(objectKey: string): Promise<void>;
  promote(uploadObjectKey: string, objectKey: string): Promise<void>;
}

export class UploadService {
  constructor(
    private readonly repository: UploadIntentRepository,
    private readonly storage: ObjectStorage,
  ) {}

  async create(
    actor: CurrentActor,
    input: {
      teamId?: string;
      purpose: FilePurpose;
      consumer?: UploadConsumer;
      originalName: string;
      contentType: string;
      size: number;
      sha256: string;
    },
    now = new Date(),
  ) {
    const validated = validateUpload(input);
    const announcementUpload = validated.consumer === "ANNOUNCEMENT";
    if (announcementUpload) {
      if (actor.role === "STUDENT" || input.teamId !== undefined) {
        throw new UploadNotFoundError();
      }
    } else if (!input.teamId) {
      throw new UploadNotFoundError();
    }
    const id = randomUUID();
    const objectScopePath = announcementUpload
      ? `announcements/${actor.id}`
      : `teams/${input.teamId}`;
    const stagingScopePath = announcementUpload
      ? `announcements/${actor.id}`
      : input.teamId!;
    const intent: UploadIntent = {
      id,
      objectKey: `${objectScopePath}/files/${id}`,
      uploadObjectKey: `staging/${stagingScopePath}/${id}`,
      contentType: validated.contentType,
      size: validated.size,
      sha256: validated.sha256,
      expiresAt: new Date(now.getTime() + 15 * 60_000),
      cleanupAfter: new Date(now.getTime() + 26 * 60 * 60_000),
    };
    const signed = await this.storage.createUploadUrl(intent);
    intent.expiresAt = signed.expiresAt;
    intent.cleanupAfter = new Date(signed.expiresAt.getTime() + 26 * 60 * 60_000);
    const created = await this.repository.createForActor({
      ...intent,
      teamId: input.teamId ?? null,
      actor,
      purpose: input.purpose,
      consumer: validated.consumer,
      originalName: validated.originalName,
    });
    if (!created) throw new UploadNotFoundError();
    return { uploadId: id, uploadUrl: signed.url };
  }

  async complete(actor: CurrentActor, uploadId: string, now = new Date()) {
    const intent = await this.repository.findPendingForOwner(uploadId, actor.id);
    if (!intent) {
      if (await this.repository.isCompletedForOwner(uploadId, actor.id)) {
        return { uploadId };
      }
      throw new UploadNotFoundError();
    }
    if (intent.expiresAt <= now) {
      throw new UploadNotFoundError();
    }
    const actual = await this.storage.inspect(intent.uploadObjectKey);
    if (
      actual.contentType !== intent.contentType ||
      actual.size !== intent.size ||
      actual.sha256 !== intent.sha256
    ) {
      throw new UploadNotFoundError();
    }
    const completed = await this.repository.finalizeWithScopeLock(
      uploadId,
      actor.id,
      now,
      async (lockedIntent) => {
        await this.storage.promote(
          lockedIntent.uploadObjectKey,
          lockedIntent.objectKey,
        );
        const promoted = await this.storage.inspect(lockedIntent.objectKey);
        if (
          promoted.contentType !== lockedIntent.contentType ||
          promoted.size !== lockedIntent.size ||
          promoted.sha256 !== lockedIntent.sha256
        ) {
          throw new UploadNotFoundError();
        }
      },
    );
    if (!completed) {
      if (await this.repository.isCompletedForOwner(uploadId, actor.id)) {
        return { uploadId };
      }
      throw new UploadNotFoundError();
    }
    return { uploadId };
  }

  async cleanup(now = new Date()) {
    await this.repository.deleteExpiredPending(now, 100);
    await this.repository.deleteExpiredReady(
      new Date(now.getTime() - 24 * 60 * 60_000),
      100,
    );
    await this.processDeletionJobs(now);
  }

  private async processDeletionJobs(now: Date) {
    for (const { objectKey, attempts } of await this.repository.claimDeletionJobs(now, 100)) {
      try {
        await this.storage.remove(objectKey);
        await this.repository.completeDeletion(objectKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 객체 삭제 오류";
        const delayMinutes = Math.min(2 ** attempts, 24 * 60);
        await this.repository.failDeletion(
          objectKey,
          message.slice(0, 2_000),
          new Date(now.getTime() + delayMinutes * 60_000),
        );
      }
    }
  }
}
