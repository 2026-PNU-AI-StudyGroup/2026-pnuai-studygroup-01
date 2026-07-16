import { z } from "zod";

const schema = z.object({
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().trim().min(1).default("qwen3.5:2b"),
});

export type OllamaEnvironment = z.infer<typeof schema>;

export function parseOllamaEnvironment(
  environment: Record<string, string | undefined>,
): OllamaEnvironment {
  const parsed = schema.parse(environment);
  const url = new URL(parsed.OLLAMA_BASE_URL);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]", "host.docker.internal"].includes(url.hostname)
  ) {
    throw new Error("OLLAMA_BASE_URL은 로컬 HTTP 주소만 허용합니다.");
  }
  return { ...parsed, OLLAMA_BASE_URL: url.origin };
}
