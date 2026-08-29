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
    // 기본값 5초는 이 저장소에 짧다. 단독으로 돌리면 통과하는 시험이 전체 실행에서만
    // 타임아웃으로 깨진다. 여러 파일이 병렬로 돌면서 jsdom 환경을 세우고 서버 액션 파일을
    // 전수 파싱하는 부하가 겹치기 때문이다. 실제로 server-action-exports 와 program-form 이
    // 같은 이유로 깨져 있었고, 진짜 실패와 구분이 안 돼 매번 단독 실행으로 확인해야 했다.
    //
    // 20초는 멈춘 시험을 여전히 잡아낸다. 가장 느린 시험도 단독 6초 안쪽이다.
    testTimeout: 20_000,
    hookTimeout: 20_000,
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
