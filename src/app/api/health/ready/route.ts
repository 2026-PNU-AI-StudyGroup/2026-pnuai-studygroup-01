import { HeadBucketCommand } from "@aws-sdk/client-s3";

import { Prisma } from "@/generated/prisma/client";
import { parseOllamaEnvironment } from "@/modules/translation/infrastructure/ollama-environment";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { objectStorageBucket, s3 } from "@/shared/infrastructure/object-storage/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [database, objectStorage, ollama] = await Promise.all([
    checkDatabase(),
    checkObjectStorage(),
    checkOllama(),
  ]);
  const ready = database === "available" && objectStorage === "available";
  return Response.json(
    { status: ready ? "ready" : "unavailable", dependencies: { database, objectStorage, ollama } },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    return "available" as const;
  } catch {
    return "unavailable" as const;
  }
}

async function checkObjectStorage() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: objectStorageBucket }), { abortSignal: AbortSignal.timeout(3_000) });
    return "available" as const;
  } catch {
    return "unavailable" as const;
  }
}

async function checkOllama() {
  try {
    const environment = parseOllamaEnvironment(process.env);
    const response = await fetch(`${environment.OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2_000), cache: "no-store" });
    return response.ok ? "available" as const : "unavailable" as const;
  } catch {
    return "unavailable" as const;
  }
}
