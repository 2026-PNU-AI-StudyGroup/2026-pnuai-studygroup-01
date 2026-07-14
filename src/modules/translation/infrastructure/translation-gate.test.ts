import { describe, expect, it } from "vitest";

import { TranslationGate } from "@/modules/translation/infrastructure/translation-gate";

describe("로컬 번역 실행 게이트", () => {
  it("한 번에 하나의 추론만 허용하고 해제 후 재사용한다", () => {
    const gate = new TranslationGate();
    const release = gate.tryAcquire();
    expect(release).toBeTypeOf("function");
    expect(gate.tryAcquire()).toBeNull();
    release?.();
    release?.();
    expect(gate.tryAcquire()).toBeTypeOf("function");
  });
});
