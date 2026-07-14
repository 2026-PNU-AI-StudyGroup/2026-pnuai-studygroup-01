import { describe, expect, it, vi } from "vitest";

import { TranslateTextService } from "@/modules/translation/application/translate-text";

describe("텍스트 번역", () => {
  it("정규화한 입력과 대상 언어를 엔진에 전달한다", async () => {
    const engine = { translate: vi.fn(async () => " Graduation project ") };
    const result = await new TranslateTextService(engine).execute({
      text: "  졸업과제  ",
      target: "en",
    });

    expect(result).toBe("Graduation project");
    expect(engine.translate).toHaveBeenCalledWith({ text: "졸업과제", target: "en" });
  });
});
