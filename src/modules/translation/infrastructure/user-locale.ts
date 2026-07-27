import { cache } from "react";

import type { SiteLocale } from "@/modules/translation/domain/site-locale";
import { normalizeSiteLocale } from "@/modules/translation/domain/site-locale";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const getUserLocale = cache(async (userId: string): Promise<SiteLocale> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLocale: true },
  });
  return normalizeSiteLocale(user?.preferredLocale);
});
