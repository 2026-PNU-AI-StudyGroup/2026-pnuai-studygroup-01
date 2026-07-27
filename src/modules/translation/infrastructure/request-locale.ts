import { cache } from "react";
import { cookies } from "next/headers";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  normalizeSiteLocale,
  type SiteLocale,
} from "@/modules/translation/domain/site-locale";
import { getUserLocale } from "@/modules/translation/infrastructure/user-locale";
import { translateUiMessage } from "@/modules/translation/ui/ui-message-catalog";

export const getRequestLocale = cache(async (): Promise<SiteLocale> => {
  const actor = await getCurrentActor();
  if (actor) return getUserLocale(actor.id);
  return normalizeSiteLocale((await cookies()).get("pms-locale")?.value);
});

export const getServerTranslator = cache(async () => {
  const locale = await getRequestLocale();
  return (message: string) => translateUiMessage(locale, message);
});
