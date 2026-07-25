import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SRC_ROOT = path.join(process.cwd(), "src");
const MODULE_ROOT = path.join(SRC_ROOT, "modules");
const SHARED_ROOT = path.join(SRC_ROOT, "shared");
const SOURCE_FILE = /\.(?:ts|tsx)$/;
const STATIC_IMPORT = /(?:from\s+|import\s*\()["'](@\/[^"']+)["']/g;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(entryPath));
    else if (SOURCE_FILE.test(entry.name)) files.push(entryPath);
  }
  return files;
}

async function importsIn(file: string): Promise<string[]> {
  const source = await readFile(file, "utf8");
  return [...source.matchAll(STATIC_IMPORT)].map((match) => match[1]);
}

function location(file: string, importedPath: string): string {
  return `${path.relative(SRC_ROOT, file)} -> ${importedPath}`;
}

describe("production module boundaries", () => {
  it("도메인은 애플리케이션, 인프라, UI 계층을 역참조하지 않는다", async () => {
    const violations: string[] = [];
    const domainFiles = (await sourceFiles(MODULE_ROOT)).filter((file) => file.includes(`${path.sep}domain${path.sep}`));

    for (const file of domainFiles) {
      for (const importedPath of await importsIn(file)) {
        if (/^@\/app\//.test(importedPath) || /^@\/shared\/infrastructure\//.test(importedPath) || /^@\/modules\/[^/]+\/(?:application|infrastructure|ui)\//.test(importedPath)) {
          violations.push(location(file, importedPath));
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("애플리케이션 계층은 라우트와 인프라 구현을 참조하지 않는다", async () => {
    const violations: string[] = [];
    const applicationFiles = (await sourceFiles(MODULE_ROOT)).filter((file) => file.includes(`${path.sep}application${path.sep}`));

    for (const file of applicationFiles) {
      for (const importedPath of await importsIn(file)) {
        if (
          /^@\/app\//.test(importedPath) ||
          /^@\/shared\/infrastructure\//.test(importedPath) ||
          /^@\/modules\/[^/]+\/infrastructure\//.test(importedPath)
        ) {
          violations.push(location(file, importedPath));
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("모듈은 라우트를, shared는 업무 모듈을 참조하지 않는다", async () => {
    const violations: string[] = [];

    for (const file of await sourceFiles(MODULE_ROOT)) {
      for (const importedPath of await importsIn(file)) {
        if (importedPath.startsWith("@/app/")) violations.push(location(file, importedPath));
      }
    }
    for (const file of await sourceFiles(SHARED_ROOT)) {
      for (const importedPath of await importsIn(file)) {
        if (importedPath.startsWith("@/modules/")) violations.push(location(file, importedPath));
      }
    }

    expect(violations).toEqual([]);
  });

  it("UI 계층은 shared 인프라 구현을 직접 조립하지 않는다", async () => {
    const violations: string[] = [];
    const uiFiles = (await sourceFiles(MODULE_ROOT)).filter((file) =>
      file.includes(`${path.sep}ui${path.sep}`),
    );

    for (const file of uiFiles) {
      for (const importedPath of await importsIn(file)) {
        if (importedPath.startsWith("@/shared/infrastructure/")) {
          violations.push(location(file, importedPath));
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
