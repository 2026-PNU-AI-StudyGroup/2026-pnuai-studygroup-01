import { describe, expect, it } from "vitest";

import { parseOllamaEnvironment } from "@/modules/translation/infrastructure/ollama-environment";

describe("Ollama 환경 설정", () => {
  it("로컬 기본값을 사용한다", () => {
    expect(parseOllamaEnvironment({})).toEqual({
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:2b",
    });
  });

  it("외부 AI API 주소를 거부한다", () => {
    expect(() => parseOllamaEnvironment({ OLLAMA_BASE_URL: "https://example.com" })).toThrow(
      "로컬 HTTP 주소만 허용",
    );
  });
});
