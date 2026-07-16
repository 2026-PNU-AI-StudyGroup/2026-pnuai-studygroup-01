import Link from "next/link";

import { NotificationService } from "@/modules/notification/application/manage-notifications";
import { PrismaNotificationRepository } from "@/modules/notification/infrastructure/prisma-notification-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function NotificationIndicator({ userId, active }: { userId: string; active: boolean }) {
  const unreadCount = await new NotificationService(new PrismaNotificationRepository(prisma)).countUnread(userId);
  const accessibleCount = unreadCount > 99 ? "99개 이상" : `${unreadCount}개`;
  return (
    <Link
      href="/notifications"
      aria-current={active ? "page" : undefined}
      aria-label={unreadCount ? `읽지 않은 알림 ${accessibleCount}` : "알림함"}
      className={`snap-color relative grid size-11 shrink-0 place-items-center rounded-lg ${active ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></svg>
      {unreadCount ? <span aria-hidden="true" className="absolute right-1 top-1 min-w-4 rounded-full bg-[var(--danger)] px-1 text-center text-[0.625rem] font-black leading-4 text-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
    </Link>
  );
}
