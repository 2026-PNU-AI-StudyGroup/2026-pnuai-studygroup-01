import { readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP_ROOT = path.join(process.cwd(), "src", "app");
const ROUTE_FILES = new Set([
  "default.tsx",
  "error.tsx",
  "layout.tsx",
  "loading.tsx",
  "not-found.tsx",
  "page.tsx",
  "route.ts",
  "template.tsx",
]);
const ROOT_ASSETS = new Set(["globals.css", "icon.svg"]);

async function findUnexpectedFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const unexpected: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith("_")) {
        unexpected.push(...await findUnexpectedFiles(absolutePath));
      }
      continue;
    }

    const relativePath = path.relative(APP_ROOT, absolutePath);
    if (ROUTE_FILES.has(entry.name)) continue;
    if (directory === APP_ROOT && ROOT_ASSETS.has(entry.name)) continue;
    unexpected.push(relativePath);
  }

  return unexpected;
}

describe("App Router production folder structure", () => {
  it("라우트 세그먼트에는 예약 파일만 직접 둔다", async () => {
    await expect(findUnexpectedFiles(APP_ROOT)).resolves.toEqual([]);
  });
});
