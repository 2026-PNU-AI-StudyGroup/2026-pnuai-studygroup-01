import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const globals = readFileSync(path.join(projectRoot, "src/app/globals.css"), "utf8");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return [];
    return [entryPath];
  });
}

describe("form control system architecture", () => {
  it("브라우저 기본 focus outline 대신 PMS border와 halo를 사용한다", () => {
    expect(globals).not.toMatch(/^\s*:focus-visible\s*\{/m);
    expect(globals).toContain(':where(a, button, input, select, textarea, [role="button"], [role="link"]):focus');
    expect(globals).toContain("outline: none");
    expect(globals).toMatch(/\.form-control:focus-visible,[\s\S]*?border-color: var\(--focus\);[\s\S]*?0 0 0 3px var\(--focus-halo\)/);
  });

  it("WebKit을 포함한 네이티브 날짜·파일·선택·체크 제어의 host appearance를 제거한다", () => {
    expect(globals).toContain("-webkit-appearance: none");
    expect(globals).toContain('input[type="date"].form-control::-webkit-calendar-picker-indicator');
    expect(globals).toContain('input[type="file"].form-control::file-selector-button');
    expect(globals).toContain('input[type="checkbox"]');
    expect(globals).toContain(".form-control:-webkit-autofill");
  });

  it("앱과 도메인 UI에는 hidden 계약 입력 외 raw native form control을 두지 않는다", () => {
    const rawControls = sourceFiles(path.join(projectRoot, "src/app"))
      .concat(sourceFiles(path.join(projectRoot, "src/modules")))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return [...source.matchAll(/<(input|textarea|select)\b([^>]*)>/g)]
          .filter((match) => !/\btype\s*=\s*["']hidden["']/.test(match[2]))
          .map((match) => `${path.relative(projectRoot, file)}: <${match[1]}>`);
      });

    expect(rawControls).toEqual([]);
  });
});
