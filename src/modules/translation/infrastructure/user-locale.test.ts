import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: <T,>(callback: T) => callback };
});
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { findUnique } },
}));

import { getUserLocale } from "@/modules/translation/infrastructure/user-locale";

describe("getUserLocale", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("returns the persisted supported locale", async () => {
    findUnique.mockResolvedValue({ preferredLocale: "en" });

    await expect(getUserLocale("user-1")).resolves.toBe("en");
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { preferredLocale: true },
    });
  });

  it.each([null, { preferredLocale: "ja" }])(
    "falls back to Korean for missing or corrupt data",
    async (user) => {
      findUnique.mockResolvedValue(user);
      await expect(getUserLocale("user-2")).resolves.toBe("ko");
    },
  );
});
