import type {
  AnnouncementAudience,
  AnnouncementPage,
  AnnouncementRecord,
  AnnouncementRepository,
  AnnouncementWriteInput,
} from "@/modules/announcement/application/announcement-ports";
import {
  canCreateAnnouncement,
  canCreateSystemAnnouncement,
  canManageAnnouncement,
  canViewAnnouncement,
} from "@/modules/announcement/domain/announcement-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { ANNOUNCEMENT_ATTACHMENT_MAX_COUNT } from "@/modules/file/domain/upload-policy";

export class AnnouncementError extends Error {}
export class AnnouncementNotFoundError extends AnnouncementError {
  constructor() {
    super("공지사항을 찾을 수 없습니다.");
  }
}
export class AnnouncementForbiddenError extends AnnouncementError {
  constructor() {
    super("이 공지사항을 관리할 권한이 없습니다.");
  }
}
export class InvalidAnnouncementAttachmentsError extends AnnouncementError {
  constructor() {
    super("첨부파일은 최대 5개, 합계 500MiB 이하로 등록해 주세요.");
  }
}

function validAttachmentIds(input: AnnouncementWriteInput, editing: boolean): boolean {
  const retained = input.retainedAttachmentIds;
  const added = input.newAttachmentUploadIds;
  const all = [...retained, ...added];
  return (editing || retained.length === 0) &&
    all.length <= ANNOUNCEMENT_ATTACHMENT_MAX_COUNT &&
    new Set(all).size === all.length;
}

const DEFAULT_PAGE_SIZE = 20;

export function normalizeAnnouncementWriteInput(input: AnnouncementWriteInput): AnnouncementWriteInput {
  if (input.teamId) {
    return {
      ...input,
      programId: null,
      visibility: "TARGET_MEMBERS",
    };
  }
  if (input.programId) {
    return {
      ...input,
      teamId: null,
      visibility: input.visibility,
    };
  }
  return {
    ...input,
    teamId: null,
    programId: null,
    visibility: "AUTHENTICATED",
  };
}

export function canWriteAnnouncementTarget(
  actor: CurrentActor,
  audience: AnnouncementAudience,
  input: Pick<AnnouncementWriteInput, "teamId" | "programId">,
): boolean {
  if (actor.id !== audience.actorId || actor.role !== audience.role) return false;
  if (actor.role === "ADMIN") return true;
  if (input.teamId) return audience.teamIds.includes(input.teamId);
  if (input.programId) return audience.programIds.includes(input.programId);
  return true;
}

export class AnnouncementService {
  constructor(private readonly repository: AnnouncementRepository) {}

  listSystem(audience: AnnouncementAudience, page: number): Promise<AnnouncementPage> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    return this.repository.listSystem(audience, safePage, DEFAULT_PAGE_SIZE);
  }

  listForProgram(audience: AnnouncementAudience, programId: string): Promise<AnnouncementRecord[]> {
    return this.repository.listForProgram(audience, programId);
  }

  listForTeam(audience: AnnouncementAudience, teamId: string): Promise<AnnouncementRecord[]> {
    return this.repository.listForTeam(audience, teamId);
  }

  listForTeamOverview(audience: AnnouncementAudience, teamId: string): Promise<AnnouncementRecord[]> {
    return this.repository.listForTeamOverview(audience, teamId);
  }

  async get(id: string): Promise<AnnouncementRecord> {
    const announcement = await this.repository.findById(id);
    if (!announcement) throw new AnnouncementNotFoundError();
    return announcement;
  }

  async create(
    actor: CurrentActor,
    audience: AnnouncementAudience,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementRecord> {
    if (!canCreateAnnouncement(actor.role)) {
      throw new AnnouncementForbiddenError();
    }
    const normalized = normalizeAnnouncementWriteInput(input);
    if (!normalized.teamId && !normalized.programId && !canCreateSystemAnnouncement(actor.role)) {
      throw new AnnouncementForbiddenError();
    }
    if (!canWriteAnnouncementTarget(actor, audience, normalized)) {
      throw new AnnouncementForbiddenError();
    }
    if (!validAttachmentIds(normalized, false)) {
      throw new InvalidAnnouncementAttachmentsError();
    }
    const outcome = await this.repository.create(actor, normalized);
    if (outcome === "INVALID_ATTACHMENTS") throw new InvalidAnnouncementAttachmentsError();
    return outcome;
  }

  async update(
    actor: CurrentActor,
    audience: AnnouncementAudience,
    id: string,
    input: AnnouncementWriteInput,
  ): Promise<void> {
    if (!canCreateAnnouncement(actor.role)) {
      throw new AnnouncementForbiddenError();
    }
    const existing = await this.repository.findById(id);
    if (!existing) throw new AnnouncementNotFoundError();
    if (!this.canManage(actor, existing)) throw new AnnouncementForbiddenError();
    const normalized = normalizeAnnouncementWriteInput(input);
    if (existing.teamId !== normalized.teamId || existing.programId !== normalized.programId) {
      throw new AnnouncementForbiddenError();
    }
    if (!canWriteAnnouncementTarget(actor, audience, normalized)) {
      throw new AnnouncementForbiddenError();
    }
    if (!validAttachmentIds(normalized, true)) {
      throw new InvalidAnnouncementAttachmentsError();
    }
    const outcome = await this.repository.update(actor, id, normalized);
    if (outcome === "NOT_FOUND") throw new AnnouncementNotFoundError();
    if (outcome === "FORBIDDEN") throw new AnnouncementForbiddenError();
    if (outcome === "INVALID_ATTACHMENTS") throw new InvalidAnnouncementAttachmentsError();
  }

  async delete(actor: CurrentActor, id: string): Promise<void> {
    if (!canCreateAnnouncement(actor.role)) {
      throw new AnnouncementForbiddenError();
    }
    const existing = await this.repository.findById(id);
    if (!existing) throw new AnnouncementNotFoundError();
    if (!this.canManage(actor, existing)) throw new AnnouncementForbiddenError();
    const outcome = await this.repository.delete(actor, id);
    if (outcome === "NOT_FOUND") throw new AnnouncementNotFoundError();
    if (outcome === "FORBIDDEN") throw new AnnouncementForbiddenError();
  }

  canManage(actor: CurrentActor, announcement: AnnouncementRecord): boolean {
    if (!announcement.teamId && !announcement.programId) {
      return actor.role === "ADMIN";
    }
    return canManageAnnouncement(actor, announcement.authorId);
  }

  canView(audience: AnnouncementAudience, announcement: AnnouncementRecord): boolean {
    return canViewAnnouncement(audience, announcement);
  }
}
