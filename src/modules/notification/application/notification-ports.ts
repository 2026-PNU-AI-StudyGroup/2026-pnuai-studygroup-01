import type { NotificationItem } from "@/modules/notification/domain/notification";

export type NotificationPage = {
  items: NotificationItem[];
  unreadCount: number;
  page: number;
  totalPages: number;
  total: number;
};

export type NotificationPreview = {
  items: NotificationItem[];
  unreadCount: number;
};

export interface NotificationRepository {
  list(recipientId: string, requestedPage: number, pageSize: number): Promise<NotificationPage>;
  preview(recipientId: string, limit: number): Promise<NotificationPreview>;
  countUnread(recipientId: string): Promise<number>;
  markRead(recipientId: string, notificationId: string, readAt: Date): Promise<string | null>;
  markAllRead(recipientId: string, readAt: Date): Promise<number>;
}

export interface DeadlineNotificationGenerator {
  generate(now: Date, endsAt: Date): Promise<number>;
}
