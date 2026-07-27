import "dotenv/config";

import { OllamaTranslationEngine } from "../src/modules/translation/infrastructure/ollama-translation-engine";
import { parseOllamaEnvironment } from "../src/modules/translation/infrastructure/ollama-environment";
import { PrismaTranslationQueueWorker } from "../src/modules/translation/infrastructure/prisma-translation-queue-worker";
import { prisma } from "../src/shared/infrastructure/database/prisma";

async function main() {
  const environment = parseOllamaEnvironment(process.env);
  const watch = process.argv.includes("--watch");
  const retryFailed = process.argv.includes("--retry-failed");
  const batchSizeArgument = process.argv.find((argument) => /^\d+$/.test(argument));
  const batchSize = Number(batchSizeArgument ?? "10");
  const worker = new PrismaTranslationQueueWorker(
    prisma,
    new OllamaTranslationEngine(environment),
    environment.OLLAMA_MODEL,
  );
  if (retryFailed) {
    const reset = await prisma.translationJob.updateMany({
      where: { status: "FAILED" },
      data: {
        status: "PENDING",
        attempts: 0,
        availableAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    });
    console.log(JSON.stringify({ resetFailed: reset.count }));
  }
  do {
    const result = await worker.processBatch(batchSize);
    console.log(JSON.stringify(result));
    if (!watch) break;
    await new Promise((resolve) => setTimeout(resolve, result.claimed > 0 ? 1_000 : 5_000));
  } while (true);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
