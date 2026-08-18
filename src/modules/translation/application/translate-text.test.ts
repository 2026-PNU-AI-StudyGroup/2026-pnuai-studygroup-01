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

  it("stores language-neutral user content without calling the model", async () => {
    const engine = { translate: vi.fn() };
    const service = new TranslateTextService(engine);

    await expect(service.execute({ text: "  2026-08-18  ", target: "en" })).resolves.toBe("2026-08-18");
    await expect(service.execute({ text: "ㅡ", target: "ko" })).resolves.toBe("ㅡ");
    expect(engine.translate).not.toHaveBeenCalled();
  });
});
