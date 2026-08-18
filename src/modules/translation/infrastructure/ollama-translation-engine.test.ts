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
    expect(request.messages[0].content).toContain("The text is self-contained");
    expect(request.messages[0].content).toContain("do not infer context");
    expect(request.messages[0].content).toContain("Markdown");
    expect(request.format).toEqual({
      type: "object",
      properties: {
        translation: { type: "string" },
      },
      required: ["translation"],
      additionalProperties: false,
    });
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe("error");
  });

  it("모델이 반환한 일반 텍스트 번역을 수용한다", async () => {
    const engine = new OllamaTranslationEngine({
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:2b",
    }, vi.fn(async () => new Response(JSON.stringify({
      message: { content: "Graduation project" },
    }), { status: 200 })) as typeof fetch);

    await expect(engine.translate({ text: "졸업과제", target: "en" })).resolves.toBe(
      "Graduation project",
    );
  });

  it("일반 문장에 모델이 덧붙인 단일 Markdown 래퍼를 제거한다", async () => {
    const engine = new OllamaTranslationEngine({
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:2b",
    }, vi.fn(async () => new Response(JSON.stringify({
      message: { content: "- **학생들은 프로젝트에 지원할 수 있습니다.**" },
    }), { status: 200 })) as typeof fetch);

    await expect(engine.translate({ text: "Students can apply to a project.", target: "ko" })).resolves.toBe(
      "학생들은 프로젝트에 지원할 수 있습니다.",
    );
  });

  it("빈 응답과 잘못된 JSON 객체를 사용 불가 오류로 처리한다", async () => {
    for (const content of ["   ", '{"text":"Graduation project"}']) {
      const engine = new OllamaTranslationEngine({
        OLLAMA_BASE_URL: "http://127.0.0.1:11434",
        OLLAMA_MODEL: "qwen3.5:2b",
      }, vi.fn(async () => new Response(JSON.stringify({
        message: { content },
      }), { status: 200 })) as typeof fetch);

      await expect(engine.translate({ text: "졸업과제", target: "en" })).rejects.toBeInstanceOf(
        TranslationUnavailableError,
      );
    }
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

  it("네트워크 예외도 사용 불가 오류로 정규화한다", async () => {
    const engine = new OllamaTranslationEngine({
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:2b",
    }, vi.fn(async () => {
      throw new TypeError("connection refused");
    }) as typeof fetch);

    await expect(engine.translate({ text: "hello", target: "ko" })).rejects.toBeInstanceOf(
      TranslationUnavailableError,
    );
  });
});
