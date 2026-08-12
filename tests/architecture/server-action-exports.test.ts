import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.join(process.cwd(), "src");
const SOURCE_FILE = /\.(?:ts|tsx)$/;

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

function isExported(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
}

function isAsync(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true;
}

function exportedValueViolations(file: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const directive = sourceFile.statements[0];
  if (!directive || !ts.isExpressionStatement(directive) || !ts.isStringLiteral(directive.expression) || directive.expression.text !== "use server") return [];

  const violations: string[] = [];
  const relativeFile = path.relative(SRC_ROOT, file);

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement) && !isAsync(statement)) {
      violations.push(`${relativeFile}: ${statement.name?.text ?? "default"}`);
    } else if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        const asyncFunction = initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) && isAsync(initializer);
        if (!asyncFunction) violations.push(`${relativeFile}: ${declaration.name.getText(sourceFile)}`);
      }
    } else if ((ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) && isExported(statement)) {
      violations.push(`${relativeFile}: ${statement.getText(sourceFile).split(/[\s({]/, 2).join(" ")}`);
    } else if (ts.isExportAssignment(statement)) {
      violations.push(`${relativeFile}: default 값 export`);
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      violations.push(`${relativeFile}: 간접 값 export`);
    }
  }

  return violations;
}

describe("server action exports", () => {
  it('"use server" 파일은 비동기 함수 값만 export한다', async () => {
    const violations: string[] = [];

    for (const file of await sourceFiles(SRC_ROOT)) {
      violations.push(...exportedValueViolations(file, await readFile(file, "utf8")));
    }

    expect(violations).toEqual([]);
  });
});
