import { getDeadlineCronSecret, isAuthorizedCronRequest } from "@/modules/notification/infrastructure/deadline-environment";
import { isUserContentTranslationEnabled } from "@/modules/translation/domain/translation-policy";
import { OllamaTranslationEngine } from "@/modules/translation/infrastructure/ollama-translation-engine";
import { parseOllamaEnvironment } from "@/modules/translation/infrastructure/ollama-environment";
import { PrismaTranslationQueueWorker } from "@/modules/translation/infrastructure/prisma-translation-queue-worker";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getDeadlineCronSecret();
  } catch {
    return Response.json({ error: "번역 작업이 구성되지 않았습니다." }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  // 꺼져 있으면 정기 작업이 실패로 기록되지 않게 조용히 건너뛴다.
  if (!isUserContentTranslationEnabled(process.env)) {
    return Response.json({ skipped: true, reason: "USER_CONTENT_TRANSLATION_DISABLED" });
  }

  const environment = parseOllamaEnvironment(process.env);
  const result = await new PrismaTranslationQueueWorker(
    prisma,
    new OllamaTranslationEngine(environment),
    environment.OLLAMA_MODEL,
  ).processBatch(10);
  return Response.json(result);
}
