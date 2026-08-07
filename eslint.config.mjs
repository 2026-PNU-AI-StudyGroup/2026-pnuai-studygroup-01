import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.type='Identifier'][callee.name=/^(alert|confirm|prompt)$/]",
          message: "브라우저 기본 대화상자 대신 ConfirmationDialog를 사용하세요.",
        },
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='Identifier'][callee.object.name=/^(window|globalThis)$/][callee.property.type='Identifier'][callee.property.name=/^(alert|confirm|prompt)$/]",
          message: "브라우저 기본 대화상자 대신 ConfirmationDialog를 사용하세요.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts"]),
]);
