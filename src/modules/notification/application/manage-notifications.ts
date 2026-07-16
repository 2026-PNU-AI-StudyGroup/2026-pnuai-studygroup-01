import type { DeadlineNotificationGenerator, NotificationRepository } from "@/modules/notification/application/notification-ports";
import { normalizeNotificationHref } from "@/modules/notification/domain/notification";

const PAGE_SIZE = 30;
const DEADLINE_HORIZON_DAYS = 7;

export class NotificationNotFoundError extends Error {
  constructor() {
    super("알림을 찾을 수 없습니다.");
    this.name = "NotificationNotFoundError";
  }
}

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(recipientId: string, requestedPage = 1) {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    return this.repository.list(recipientId, page, PAGE_SIZE);
  }

  countUnread(recipientId: string) {
    return this.repository.countUnread(recipientId);
  }

  async open(recipientId: string, notificationId: string) {
    const href = await this.repository.markRead(recipientId, notificationId, this.now());
    if (!href) throw new NotificationNotFoundError();
    return normalizeNotificationHref(href);
  }

  markAllRead(recipientId: string) {
    return this.repository.markAllRead(recipientId, this.now());
  }
}

export class GenerateDeadlineNotificationsService {
  constructor(private readonly generator: DeadlineNotificationGenerator) {}

  execute(now = new Date()) {
    const endsAt = new Date(now.getTime() + DEADLINE_HORIZON_DAYS * 86_400_000);
    return this.generator.generate(now, endsAt);
  }
}
