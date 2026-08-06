import { randomUUID } from "node:crypto";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  hasProfileImageMagicBytes,
  type ProfileImageContentType,
  validateProfileImageUpload,
} from "@/modules/identity/domain/profile-image-policy";

export class ProfileImageNotFoundError extends Error {
  constructor() {
    super("프로필 사진 정보를 찾을 수 없습니다.");
    this.name = "ProfileImageNotFoundError";
  }
}

export type ProfileImageUploadIntent = {
  id: string;
  objectKey: string;
  uploadObjectKey: string;
  contentType: ProfileImageContentType;
  size: number;
  sha256: string;
  expiresAt: Date;
  cleanupAfter: Date;
};

export type ProfileImageRecord = {
  userId: string;
  objectKey: string;
  contentType: ProfileImageContentType;
  size: number;
  sha256: string;
  updatedAt: Date;
};

export interface ProfileImageRepository {
  createUploadForOwner(intent: ProfileImageUploadIntent & { ownerId: string; originalName: string }): Promise<boolean>;
  findPendingForOwner(id: string, ownerId: string): Promise<ProfileImageUploadIntent | null>;
  isCompletedForOwner(id: string, ownerId: string): Promise<boolean>;
  finalizeForOwner(
    id: string,
    ownerId: string,
    completedAt: Date,
    promote: (intent: ProfileImageUploadIntent) => Promise<void>,
  ): Promise<boolean>;
  removeForOwner(ownerId: string, deletedAt: Date): Promise<boolean>;
  findForOwner(ownerId: string): Promise<Pick<ProfileImageRecord, "updatedAt"> | null>;
  findVisibleForActor(userId: string, actor: CurrentActor): Promise<ProfileImageRecord | null>;
  deleteExpiredPending(now: Date, limit: number): Promise<void>;
}

export interface ProfileImageStorage {
  createUploadUrl(intent: ProfileImageUploadIntent): Promise<{ url: string; expiresAt: Date }>;
  inspect(objectKey: string): Promise<{ contentType?: string; size?: number; sha256?: string }>;
  readPrefix(objectKey: string, length: number): Promise<Uint8Array>;
  promote(uploadObjectKey: string, objectKey: string): Promise<void>;
}

export class ProfileImageService {
  constructor(
    private readonly repository: ProfileImageRepository,
    private readonly storage: ProfileImageStorage,
  ) {}

  async create(
    actor: CurrentActor,
    input: { originalName: string; contentType: string; size: number; sha256: string },
    now = new Date(),
  ): Promise<{ uploadId: string; uploadUrl: string }> {
    const validated = validateProfileImageUpload(input);
    const id = randomUUID();
    const intent: ProfileImageUploadIntent = {
      id,
      objectKey: `profile-images/${actor.id}/${id}`,
      uploadObjectKey: `staging/profile-images/${actor.id}/${id}`,
      contentType: validated.contentType,
      size: validated.size,
      sha256: validated.sha256,
      expiresAt: new Date(now.getTime() + 15 * 60_000),
      cleanupAfter: new Date(now.getTime() + 26 * 60 * 60_000),
    };
    const signed = await this.storage.createUploadUrl(intent);
    intent.expiresAt = signed.expiresAt;
    intent.cleanupAfter = new Date(signed.expiresAt.getTime() + 26 * 60 * 60_000);
    if (!(await this.repository.createUploadForOwner({ ...intent, ownerId: actor.id, originalName: validated.originalName }))) {
      throw new ProfileImageNotFoundError();
    }
    return { uploadId: id, uploadUrl: signed.url };
  }

  async complete(actor: CurrentActor, uploadId: string, now = new Date()): Promise<{ uploadId: string }> {
    const intent = await this.repository.findPendingForOwner(uploadId, actor.id);
    if (!intent) {
      if (await this.repository.isCompletedForOwner(uploadId, actor.id)) return { uploadId };
      throw new ProfileImageNotFoundError();
    }
    if (intent.expiresAt <= now) throw new ProfileImageNotFoundError();
    await this.assertStoredImageMatches(intent, intent.uploadObjectKey);
    const completed = await this.repository.finalizeForOwner(uploadId, actor.id, now, async (lockedIntent) => {
      await this.storage.promote(lockedIntent.uploadObjectKey, lockedIntent.objectKey);
      await this.assertStoredImageMatches(lockedIntent, lockedIntent.objectKey);
    });
    if (!completed) {
      if (await this.repository.isCompletedForOwner(uploadId, actor.id)) return { uploadId };
      throw new ProfileImageNotFoundError();
    }
    return { uploadId };
  }

  remove(actor: CurrentActor, now = new Date()): Promise<boolean> {
    return this.repository.removeForOwner(actor.id, now);
  }

  getForOwner(ownerId: string): Promise<Pick<ProfileImageRecord, "updatedAt"> | null> {
    return this.repository.findForOwner(ownerId);
  }

  cleanupExpired(now = new Date()): Promise<void> {
    return this.repository.deleteExpiredPending(now, 100);
  }

  private async assertStoredImageMatches(intent: ProfileImageUploadIntent, objectKey: string): Promise<void> {
    const actual = await this.storage.inspect(objectKey);
    if (
      actual.contentType !== intent.contentType ||
      actual.size !== intent.size ||
      actual.sha256 !== intent.sha256 ||
      !hasProfileImageMagicBytes(intent.contentType, await this.storage.readPrefix(objectKey, 32))
    ) {
      throw new ProfileImageNotFoundError();
    }
  }
}
