"use server";

import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function acceptPrivacyConsentAction(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/");

  // 체크박스의 required 는 브라우저 쪽 도움일 뿐이다. 동의 여부는 서버에서 다시 본다.
  if (formData.get("privacyConsent") !== "on") redirect("/onboarding");

  // 이미 동의한 사용자의 최초 동의 시각을 덮어쓰지 않는다.
  await prisma.user.updateMany({
    where: { id: actor.id, privacyConsentAt: null },
    data: { privacyConsentAt: new Date() },
  });

  redirect("/onboarding");
}
