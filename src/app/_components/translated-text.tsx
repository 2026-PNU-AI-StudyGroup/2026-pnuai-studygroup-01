import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ReadStoredTranslationService } from "@/modules/translation/application/read-stored-translation";
import { PrismaStoredTranslationReader } from "@/modules/translation/infrastructure/prisma-stored-translation-reader";
import { getUserLocale } from "@/modules/translation/infrastructure/user-locale";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { TranslatedTextClient } from "@/shared/ui/translated-text-client";

export async function TranslatedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const actor = await getCurrentActor();
  const locale = actor ? await getUserLocale(actor.id) : "ko";
  const translation = await new ReadStoredTranslationService(
    new PrismaStoredTranslationReader(prisma),
  ).execute(text, locale);

  return (
    <TranslatedTextClient
      original={text}
      translation={translation}
      locale={locale}
      className={className}
    />
  );
}
