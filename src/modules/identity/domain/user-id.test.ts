import { describe, expect, it } from "vitest";

import { userIdSchema } from "@/modules/identity/domain/user-id";

describe("사용자 ID 검증", () => {
  it("better-auth 가 만드는 32자 영숫자 ID 를 받아들인다", () => {
    expect(userIdSchema.safeParse("Kq3vX9pLmZ2sTbN7wRyF4gHcJdQe8UaV").success).toBe(true);
  });

  it("시드 계정의 UUID 도 그대로 받아들인다", () => {
    expect(userIdSchema.safeParse("20000000-0000-4000-8000-000000000001").success).toBe(true);
  });

  it("빈 값과 과도하게 긴 값은 거른다", () => {
    expect(userIdSchema.safeParse("").success).toBe(false);
    expect(userIdSchema.safeParse("   ").success).toBe(false);
    expect(userIdSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});
