"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { isSiteLocale } from "@/modules/translation/domain/site-locale";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function updateLanguageAction(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor) return;
  const locale = formData.get("locale");
  if (!isSiteLocale(locale)) return;

  await prisma.user.update({
    where: { id: actor.id },
    data: { preferredLocale: locale },
  });
  const cookieStore = await cookies();
  cookieStore.set("pms-locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
