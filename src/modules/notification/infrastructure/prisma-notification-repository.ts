import type { PrismaClient } from "@/generated/prisma/client";
import type { NotificationPage, NotificationPreview, NotificationRepository } from "@/modules/notification/application/notification-ports";

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(recipientId: string, requestedPage: number, pageSize: number): Promise<NotificationPage> {
    const total = await this.client.notification.count({ where: { recipientId } });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const [items, unreadCount] = await Promise.all([
      this.client.notification.findMany({
        where: { recipientId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
      }),
      this.countUnread(recipientId),
    ]);
    return { items, unreadCount, page, totalPages, total };
  }

  async preview(recipientId: string, limit: number): Promise<NotificationPreview> {
    const [items, unreadCount] = await Promise.all([
      this.client.notification.findMany({
        where: { recipientId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
      }),
      this.countUnread(recipientId),
    ]);
    return { items, unreadCount };
  }

  countUnread(recipientId: string) {
    return this.client.notification.count({ where: { recipientId, readAt: null } });
  }

  async markRead(recipientId: string, notificationId: string, readAt: Date): Promise<string | null> {
    return this.client.$transaction(async (transaction) => {
      const notification = await transaction.notification.findFirst({
        where: { id: notificationId, recipientId },
        select: { href: true, readAt: true },
      });
      if (!notification) return null;
      if (!notification.readAt) {
        await transaction.notification.update({ where: { id: notificationId }, data: { readAt } });
      }
      return notification.href;
    });
  }

  markAllRead(recipientId: string, readAt: Date) {
    return this.client.notification.updateMany({ where: { recipientId, readAt: null }, data: { readAt } }).then(({ count }) => count);
  }
}
