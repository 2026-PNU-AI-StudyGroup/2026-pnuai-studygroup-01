import {
  NotificationPopover,
  type NotificationPreviewItem,
} from "@/modules/notification/ui/notification-popover";

export function NotificationIndicator({
  active,
  placement = "side",
  inverse = false,
  unreadCount,
  items,
  openNotification,
}: {
  active: boolean;
  placement?: "side" | "below";
  inverse?: boolean;
  unreadCount: number;
  items: NotificationPreviewItem[];
  openNotification: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <NotificationPopover
      active={active}
      placement={placement}
      inverse={inverse}
      unreadCount={unreadCount}
      openNotification={openNotification}
      items={items}
    />
  );
}
