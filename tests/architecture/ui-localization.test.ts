import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import englishMessages from "@/shared/i18n/ui-messages.en.json";

const sourceRoot = path.join(process.cwd(), "src");
const localizedNativeElements = new Set([
  "input",
  "textarea",
  "button",
  "nav",
  "section",
  "aside",
  "div",
  "ul",
  "ol",
  "article",
  "Link",
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated") return [];
      return sourceFiles(entryPath);
    }
    if (
      !entry.name.match(/\.tsx?$/) ||
      entry.name.includes(".test.") ||
      entry.name.endsWith(".d.ts")
    ) {
      return [];
    }
    if (
      entryPath.includes("/modules/translation/ui/")
      || entryPath.includes("/shared/i18n/")
    ) return [];
    return [entryPath];
  });
}

function canonicalTemplate(node: ts.TemplateExpression): string {
  return [
    node.head.text,
    ...node.templateSpans.flatMap((span, index) => [
      `{${index}}`,
      span.literal.text,
    ]),
  ].join("");
}

describe("UI localization architecture", () => {
  it("keeps every fixed Korean source message in the pre-generated English catalog", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(sourceRoot)) {
      const source = readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node) => {
        const message =
          ts.isStringLiteral(node) && /[가-힣]/.test(node.text)
            ? node.text
            : ts.isTemplateExpression(node)
              ? canonicalTemplate(node)
              : null;
        if (
          message &&
          /[가-힣]/.test(message) &&
          !(message in englishMessages)
        ) {
          missing.push(`${path.relative(process.cwd(), file)}: ${message}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
    expect(missing).toEqual([]);
  });

  it("does not leave Korean JSX text or localized native attributes unwrapped", () => {
    const violations: string[] = [];
    for (const file of sourceFiles(sourceRoot).filter((entry) =>
      entry.endsWith(".tsx"),
    )) {
      const source = readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node) && /[가-힣]/.test(node.text)) {
          violations.push(`${path.relative(process.cwd(), file)}: raw JSX text`);
        }
        if (
          ts.isJsxAttribute(node) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          /[가-힣]/.test(node.initializer.text)
        ) {
          const element = node.parent.parent;
          const tagName =
            ts.isJsxOpeningElement(element) ||
            ts.isJsxSelfClosingElement(element)
              ? element.tagName.getText(sourceFile)
              : "";
          if (localizedNativeElements.has(tagName)) {
            violations.push(
              `${path.relative(process.cwd(), file)}: ${tagName}.${node.name.getText(sourceFile)}`,
            );
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
    expect(violations).toEqual([]);
  });
});
