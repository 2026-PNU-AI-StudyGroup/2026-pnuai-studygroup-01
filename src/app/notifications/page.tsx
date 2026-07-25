import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { markAllNotificationsReadAction, openNotificationAction } from "@/app/_actions/notification-actions";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { NotificationService } from "@/modules/notification/application/manage-notifications";
import { PrismaNotificationRepository } from "@/modules/notification/infrastructure/prisma-notification-repository";
import { NotificationCenter } from "@/modules/notification/ui/notification-center";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "알림" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new NotificationService(new PrismaNotificationRepository(prisma)).list(actor.id, requestedPage);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/notifications">
      <NotificationCenter
        data={data}
        openNotification={openNotificationAction}
        markAllRead={markAllNotificationsReadAction}
      />
    </AppShell>
  );
}
