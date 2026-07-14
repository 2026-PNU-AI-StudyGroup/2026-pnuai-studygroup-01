import { z } from "zod";

import { translationTargets } from "@/modules/translation/domain/translation-policy";

export const translationInputSchema = z.object({
  text: z.string().min(1).max(2_000),
  target: z.enum(translationTargets),
});
