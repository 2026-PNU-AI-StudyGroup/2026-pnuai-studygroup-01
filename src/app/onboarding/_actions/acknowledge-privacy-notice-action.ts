"use server";

import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function acknowledgePrivacyNoticeAction(): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/");

  // 이미 확인한 사용자의 최초 확인 시각을 덮어쓰지 않는다.
  await prisma.user.updateMany({
    where: { id: actor.id, privacyNoticeAckAt: null },
    data: { privacyNoticeAckAt: new Date() },
  });

  redirect("/onboarding");
}
