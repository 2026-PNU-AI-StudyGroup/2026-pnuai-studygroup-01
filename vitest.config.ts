import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/generated/**",
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/app/**/{layout,loading,error,not-found}.tsx",
      ],
      thresholds: {
        statements: 36,
        branches: 32,
        functions: 43,
        lines: 39,
        "src/modules/translation/**": {
          statements: 97,
          branches: 93,
          functions: 100,
          lines: 97,
        },
      },
    },
  },
});
