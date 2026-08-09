import type {
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementPage,
  AnnouncementRecord,
  AnnouncementRepository,
  AnnouncementWriteInput,
} from "@/modules/announcement/application/announcement-ports";
import {
  canCreateAnnouncement,
  canManageAnnouncement,
  canViewAnnouncement,
} from "@/modules/announcement/domain/announcement-policy";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

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

const DEFAULT_PAGE_SIZE = 20;

export class AnnouncementService {
  constructor(private readonly repository: AnnouncementRepository) {}

  list(audience: AnnouncementAudience, page: number, category?: AnnouncementCategory): Promise<AnnouncementPage> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    return this.repository.list(audience, safePage, DEFAULT_PAGE_SIZE, category);
  }

  async get(id: string): Promise<AnnouncementRecord> {
    const announcement = await this.repository.findById(id);
    if (!announcement) throw new AnnouncementNotFoundError();
    return announcement;
  }

  async create(
    actor: CurrentActor,
    input: AnnouncementWriteInput,
  ): Promise<AnnouncementRecord> {
    if (!canCreateAnnouncement(actor.role)) {
      throw new AnnouncementForbiddenError();
    }
    return await this.repository.create(actor.id, input);
  }

  async update(
    actor: CurrentActor,
    id: string,
    input: AnnouncementWriteInput,
  ): Promise<void> {
    if (!canCreateAnnouncement(actor.role)) {
      throw new AnnouncementForbiddenError();
    }
    const outcome = await this.repository.update(actor, id, input);
    if (outcome === "NOT_FOUND") throw new AnnouncementNotFoundError();
    if (outcome === "FORBIDDEN") throw new AnnouncementForbiddenError();
  }

  async delete(actor: CurrentActor, id: string): Promise<void> {
    if (!canCreateAnnouncement(actor.role)) {
      throw new AnnouncementForbiddenError();
    }
    const outcome = await this.repository.delete(actor, id);
    if (outcome === "NOT_FOUND") throw new AnnouncementNotFoundError();
    if (outcome === "FORBIDDEN") throw new AnnouncementForbiddenError();
  }

  canManage(actor: CurrentActor, announcement: AnnouncementRecord): boolean {
    return canManageAnnouncement(actor, announcement.authorId);
  }

  canView(audience: AnnouncementAudience, announcement: AnnouncementRecord): boolean {
    return canViewAnnouncement(audience, announcement);
  }
}
