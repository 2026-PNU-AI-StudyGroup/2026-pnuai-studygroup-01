import { readFile, readdir } from "node:fs/promises";
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
const ROOT_ASSETS = new Set(["globals.css", "icon.png"]);
const IGNORED_FILES = new Set([".DS_Store"]);
const FULL_PAGE_LOADING_BOUNDARIES = new Set([
  "loading.tsx",
  path.join("dashboard", "loading.tsx"),
  path.join("teams", "[teamId]", "loading.tsx"),
]);

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
    if (IGNORED_FILES.has(entry.name)) continue;
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

  it("앱 셸을 통째로 대체하는 전체 화면 로딩 경계를 두지 않는다", async () => {
    const sourceFiles = await findSourceFiles(APP_ROOT);
    const loadingBoundaries = sourceFiles
      .map((file) => path.relative(APP_ROOT, file))
      .filter((file) => FULL_PAGE_LOADING_BOUNDARIES.has(file));

    expect(loadingBoundaries).toEqual([]);
  });

  it("라우트 private 구현은 다른 최상위 라우트에서 참조하지 않는다", async () => {
    const violations: string[] = [];
    const sourceFiles = await findSourceFiles(APP_ROOT);

    for (const file of sourceFiles) {
      const sourceTopLevel = topLevelRoute(path.relative(APP_ROOT, file));
      for (const importedPath of await importsIn(file)) {
        const targetTopLevel = topLevelRoute(importedPath.replace(/^@\/app\//, ""));
        if (
          sourceTopLevel !== targetTopLevel &&
          !targetTopLevel.startsWith("_")
        ) {
          violations.push(
            `${path.relative(APP_ROOT, file)} -> ${importedPath}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

const SOURCE_FILE = /\.(?:ts|tsx)$/;
const APP_IMPORT = /(?:from\s+|import\s*\()["'](@\/app\/[^"']+)["']/g;

async function findSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findSourceFiles(entryPath));
    else if (SOURCE_FILE.test(entry.name)) files.push(entryPath);
  }

  return files;
}

async function importsIn(file: string): Promise<string[]> {
  const source = await readFile(file, "utf8");
  return [...source.matchAll(APP_IMPORT)].map((match) => match[1]);
}

function topLevelRoute(relativePath: string): string {
  return relativePath.split(path.sep)[0];
}
