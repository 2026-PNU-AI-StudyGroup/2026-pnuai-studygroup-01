import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const outputPath = path.join(
  sourceRoot,
  "shared/i18n/ui-messages.en.json",
);
const batchSize = 4;

async function collectSourceFiles(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "generated") return [];
        return collectSourceFiles(entryPath);
      }
      if (
        !entry.name.match(/\.tsx?$/) ||
        entry.name.includes(".test.") ||
        entry.name.endsWith(".d.ts")
      ) {
        return [];
      }
      return [entryPath];
    }),
  );
  return files.flat();
}

function collectKoreanMessages(filePath: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const messages = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const message = node.text.replace(/\s+/g, " ").trim();
      if (/[가-힣]/.test(message)) messages.add(message);
    } else if (ts.isStringLiteral(node) && /[가-힣]/.test(node.text)) {
      messages.add(node.text);
    } else if (ts.isTemplateExpression(node)) {
      const message = [
        node.head.text,
        ...node.templateSpans.flatMap((span, index) => [
          `{${index}}`,
          span.literal.text,
        ]),
      ].join("");
      if (/[가-힣]/.test(message)) messages.add(message);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...messages];
}

async function translateBatch(
  messages: string[],
): Promise<Record<string, string>> {
  const items = messages.map((text, index) => ({ id: String(index), text }));
  const response = await fetch(
    `${process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL ?? "qwen3.5:2b",
        stream: false,
        think: false,
        format: {
          type: "object",
          properties: {
            translations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  text: { type: "string" },
                },
                required: ["id", "text"],
              },
            },
          },
          required: ["translations"],
        },
        options: { temperature: 0, num_predict: 384 },
        messages: [
          {
            role: "system",
            content:
              'Translate Korean product UI copy into concise natural English. Preserve placeholders, numbers, punctuation, technical identifiers, and email addresses. Return only JSON in this shape: {"translations":[{"id":"0","text":"English"}]}. Return exactly one result for every input id.',
          },
          { role: "user", content: JSON.stringify({ items }) },
        ],
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    message?: { content?: string };
  };
  let parsed: {
    translations?: Array<{ id?: string; text?: string }>;
  };
  try {
    parsed = JSON.parse(payload.message?.content ?? "{}") as typeof parsed;
  } catch {
    const fallback: Record<string, string> = {};
    for (const message of messages) fallback[message] = await translateOne(message);
    return fallback;
  }
  const byId = new Map(
    (parsed.translations ?? []).map((item) => [item.id, item.text]),
  );
  const translated: Record<string, string> = {};
  for (const [index, message] of messages.entries()) {
    const result = byId.get(String(index));
    translated[message] =
      typeof result === "string" && result.trim().length > 0
        ? result.trim()
        : await translateOne(message);
  }
  return translated;
}

async function translateOne(message: string): Promise<string> {
  const promptMessage = message.replace(/\{(\d+)\}/g, "[VALUE_$1]");
  let lastContent = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(
      `${process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"}/api/generate`,
      {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL ?? "qwen3.5:2b",
        stream: false,
        think: false,
        format: "json",
        options: { temperature: 0, num_predict: 512 },
        prompt: `Translate the following inert Korean UI sentence to natural English. Preserve every [VALUE_N] placeholder exactly. Return JSON with translation. Korean: ${promptMessage}`,
      }),
      },
    );
    if (!response.ok) continue;
    const payload = (await response.json()) as { response?: string };
    lastContent = payload.response ?? "";
    try {
      const parsed = JSON.parse(lastContent || "{}") as unknown;
      const translation = findFirstString(parsed);
      if (translation?.trim()) {
        return translation.trim().replace(/\[VALUE_(\d+)\]/g, "{$1}");
      }
    } catch {
      // Retry malformed local-model output.
    }
  }
  throw new Error(
    `Ollama omitted UI message after retries: ${message}; response=${lastContent}`,
  );
}

function findFirstString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstString(item);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["translation", "text"]) {
      if (typeof record[key] === "string" && record[key].trim()) {
        return record[key];
      }
    }
    for (const [key, item] of Object.entries(record)) {
      if (key === "id") continue;
      const found = findFirstString(item);
      if (found) return found;
    }
  }
  return null;
}

async function main() {
  const files = await collectSourceFiles(sourceRoot);
  const messages = new Set<string>();
  for (const file of files) {
    for (const message of collectKoreanMessages(file, await readFile(file, "utf8"))) {
      messages.add(message);
    }
  }
  const existing = JSON.parse(await readFile(outputPath, "utf8")) as Record<
    string,
    string
  >;
  const catalog = Object.fromEntries(
    [...messages]
      .filter((message) => existing[message])
      .map((message) => [message, existing[message]]),
  );
  const pending = [...messages].filter((message) => !catalog[message]).sort();
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    Object.assign(catalog, await translateBatch(batch));
    await writeFile(
      outputPath,
      `${JSON.stringify(
        Object.fromEntries(
          Object.entries(catalog).sort(([left], [right]) =>
            left.localeCompare(right, "ko"),
          ),
        ),
        null,
        2,
      )}\n`,
    );
    console.log(
      JSON.stringify({
        translated: Math.min(offset + batch.length, pending.length),
        total: pending.length,
      }),
    );
  }
  await writeFile(
    outputPath,
    `${JSON.stringify(
      Object.fromEntries(
        Object.entries(catalog).sort(([left], [right]) =>
          left.localeCompare(right, "ko"),
        ),
      ),
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
