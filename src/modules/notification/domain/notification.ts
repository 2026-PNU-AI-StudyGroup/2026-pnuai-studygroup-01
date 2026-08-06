export type NotificationType =
  | "APPLICATION_RESULT"
  | "REPORT_ACTIVITY"
  | "PROJECT_REQUEST"
  | "DISCUSSION"
  | "TOPIC_APPROVAL"
  | "DEADLINE"
  | "SYSTEM";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
};

export function normalizeNotificationHref(href: string): string {
  return href.startsWith("/") && !href.startsWith("//") ? href : "/notifications";
}
