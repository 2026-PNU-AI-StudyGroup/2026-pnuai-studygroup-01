import { describe, expect, it, vi } from "vitest";

import { TranslationUnavailableError } from "@/modules/translation/application/translate-text";
import { OllamaTranslationEngine } from "@/modules/translation/infrastructure/ollama-translation-engine";

describe("Ollama 번역 어댑터", () => {
  it("thinking과 streaming을 끄고 구조화 번역을 요청한다", async () => {
    const fetcher = vi.fn(async (...args: [RequestInfo | URL, RequestInit?]) => {
      void args;
      return new Response(JSON.stringify({
        message: { content: JSON.stringify({ translation: "Graduation project" }) },
      }), { status: 200 });
    });
    const engine = new OllamaTranslationEngine({
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:2b",
    }, fetcher as typeof fetch);

    await expect(engine.translate({ text: "졸업과제", target: "en" })).resolves.toBe(
      "Graduation project",
    );
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({ model: "qwen3.5:2b", stream: false, think: false });
    expect(request.format.required).toEqual(["translation"]);
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe("error");
  });

  it("연결 및 응답 오류를 사용 불가 오류로 감춘다", async () => {
    const engine = new OllamaTranslationEngine({
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:2b",
    }, vi.fn(async () => new Response("bad gateway", { status: 502 })) as typeof fetch);

    await expect(engine.translate({ text: "hello", target: "ko" })).rejects.toBeInstanceOf(
      TranslationUnavailableError,
    );
  });
});
