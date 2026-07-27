import type { Metadata } from "next";

import { getServerTranslator } from "@/modules/translation/infrastructure/request-locale";

export async function getLocalizedMetadata(title: string): Promise<Metadata> {
  const t = await getServerTranslator();
  return { title: t(title) };
}
