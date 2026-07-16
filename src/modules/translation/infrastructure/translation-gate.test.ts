import { describe, expect, it } from "vitest";

import { TranslationGate } from "@/modules/translation/infrastructure/translation-gate";

describe("로컬 번역 실행 게이트", () => {
  it("한 번에 하나의 추론만 허용하고 다른 사용자는 해제 후 사용할 수 있다", () => {
    const gate = new TranslationGate();
    const release = gate.tryAcquire("student-1");
    expect(release).toBeTypeOf("function");
    expect(gate.tryAcquire("student-2")).toBeNull();
    release?.();
    release?.();
    expect(gate.tryAcquire("student-2")).toBeTypeOf("function");
  });

  it("같은 사용자의 연속 점유를 cooldown 동안 거절한다", () => {
    let now = 1_000;
    const gate = new TranslationGate(5_000, () => now);
    const release = gate.tryAcquire("student-1");
    release?.();
    expect(gate.tryAcquire("student-1")).toBeNull();
    now += 5_000;
    expect(gate.tryAcquire("student-1")).toBeTypeOf("function");
  });
});
