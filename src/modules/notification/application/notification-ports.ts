import type { NotificationItem } from "@/modules/notification/domain/notification";

export type NotificationPage = {
  items: NotificationItem[];
  unreadCount: number;
  page: number;
  totalPages: number;
  total: number;
};

export interface NotificationRepository {
  list(recipientId: string, requestedPage: number, pageSize: number): Promise<NotificationPage>;
  countUnread(recipientId: string): Promise<number>;
  markRead(recipientId: string, notificationId: string, readAt: Date): Promise<string | null>;
  markAllRead(recipientId: string, readAt: Date): Promise<number>;
}

export interface DeadlineNotificationGenerator {
  generate(now: Date, endsAt: Date): Promise<number>;
}
