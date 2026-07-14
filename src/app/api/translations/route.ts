import { NextResponse } from "next/server";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  TranslateTextService,
  TranslationUnavailableError,
} from "@/modules/translation/application/translate-text";
import { InvalidTranslationInputError } from "@/modules/translation/domain/translation-policy";
import { OllamaTranslationEngine } from "@/modules/translation/infrastructure/ollama-translation-engine";
import { translationGate } from "@/modules/translation/infrastructure/translation-gate";
import { translationInputSchema } from "@/modules/translation/ui/translation-input";
import {
  readLimitedJson,
  RequestBodyTooLargeError,
} from "@/shared/http/read-limited-json";

const maximumRequestBytes = 16 * 1_024;

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await readLimitedJson(request, maximumRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: error.message }, { status: 413 });
    }
    return NextResponse.json({ message: "올바른 JSON 요청이 아닙니다." }, { status: 400 });
  }
  const parsed = translationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "번역할 내용을 확인해 주세요." }, { status: 400 });
  }

  const release = translationGate.tryAcquire();
  if (!release) {
    return NextResponse.json(
      { message: "다른 번역을 처리 중입니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  try {
    const translation = await new TranslateTextService(new OllamaTranslationEngine()).execute(parsed.data);
    return NextResponse.json({ translation });
  } catch (error) {
    if (error instanceof InvalidTranslationInputError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof TranslationUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    throw error;
  } finally {
    release();
  }
}
