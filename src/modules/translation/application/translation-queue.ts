import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  isUserContentTranslationEnabled,
  normalizeTranslationText,
  translationTargets,
  type TranslationTarget,
} from "@/modules/translation/domain/translation-policy";

export type TranslationQueueClient = Pick<
  Prisma.TransactionClient,
  "translationSource" | "translationJob"
>;

export function translationSourceHash(text: string): string {
  return createHash("sha256").update(normalizeTranslationText(text)).digest("hex");
}

export async function enqueueTranslations(
  client: TranslationQueueClient,
  values: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  // 꺼져 있으면 원문 복사본도 남기지 않는다. 처리하지 않을 일감을 쌓아 둘 이유가 없다.
  if (!isUserContentTranslationEnabled(process.env)) return;

  const sources = [
    ...new Map(
      values
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => {
          const text = normalizeTranslationText(value);
          return [translationSourceHash(text), text] as const;
        }),
    ).entries(),
  ].map(([hash, text]) => ({ hash, text }));

  if (sources.length === 0) return;

  await client.translationSource.createMany({ data: sources, skipDuplicates: true });
  await client.translationJob.createMany({
    data: sources.flatMap(({ hash }) =>
      translationTargets.map((targetLocale) => ({
        sourceHash: hash,
        targetLocale,
      })),
    ),
    skipDuplicates: true,
  });
}

export type ClaimedTranslationJob = {
  id: string;
  sourceHash: string;
  targetLocale: TranslationTarget;
  attempts: number;
  text: string;
};
