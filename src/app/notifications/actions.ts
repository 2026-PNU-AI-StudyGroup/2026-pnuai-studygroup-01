"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { NotificationNotFoundError, NotificationService } from "@/modules/notification/application/manage-notifications";
import { PrismaNotificationRepository } from "@/modules/notification/infrastructure/prisma-notification-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function openNotificationAction(formData: FormData) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId || notificationId.length > 200) redirect("/notifications");
  try {
    const href = await new NotificationService(new PrismaNotificationRepository(prisma)).open(actor.id, notificationId);
    revalidatePath("/notifications");
    redirect(href);
  } catch (error) {
    if (error instanceof NotificationNotFoundError) redirect("/notifications");
    throw error;
  }
}

export async function markAllNotificationsReadAction() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  await new NotificationService(new PrismaNotificationRepository(prisma)).markAllRead(actor.id);
  revalidatePath("/notifications");
}
