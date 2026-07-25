import { NotificationService } from "@/modules/notification/application/manage-notifications";
import { PrismaNotificationRepository } from "@/modules/notification/infrastructure/prisma-notification-repository";
import { NotificationIndicator } from "@/modules/notification/ui/notification-indicator";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function NotificationIndicatorContainer({
  userId,
  active,
  placement = "side",
  inverse = false,
  openNotification,
}: {
  userId: string;
  active: boolean;
  placement?: "side" | "below";
  inverse?: boolean;
  openNotification: (formData: FormData) => void | Promise<void>;
}) {
  const preview = await new NotificationService(
    new PrismaNotificationRepository(prisma),
  ).preview(userId);

  return (
    <NotificationIndicator
      active={active}
      placement={placement}
      inverse={inverse}
      unreadCount={preview.unreadCount}
      openNotification={openNotification}
      items={preview.items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        type: item.type,
        read: Boolean(item.readAt),
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  );
}
