import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, currentActorMock, userLocaleMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  currentActorMock: vi.fn(),
  userLocaleMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: currentActorMock,
}));
vi.mock("@/modules/translation/infrastructure/user-locale", () => ({
  getUserLocale: userLocaleMock,
}));

describe("request locale", () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    currentActorMock.mockReset();
    userLocaleMock.mockReset();
    currentActorMock.mockResolvedValue(null);
  });

  it("uses the signed-in user's persisted locale before the request cookie", async () => {
    currentActorMock.mockResolvedValue({ id: "user-1" });
    userLocaleMock.mockResolvedValue("ko");
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: "en" })),
    });
    const { getRequestLocale } = await import(
      "@/modules/translation/infrastructure/request-locale"
    );

    await expect(getRequestLocale()).resolves.toBe("ko");
    expect(userLocaleMock).toHaveBeenCalledWith("user-1");
  });

  it("reads a supported locale from the request cookie for signed-out pages", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: "en" })),
    });
    const { getRequestLocale, getServerTranslator } = await import(
      "@/modules/translation/infrastructure/request-locale"
    );

    await expect(getRequestLocale()).resolves.toBe("en");
    await expect(getServerTranslator()).resolves.toEqual(expect.any(Function));
    expect((await getServerTranslator())("프로젝트 찾기")).toBe("Find Projects");
  });

  it("falls back to Korean for a missing or unsupported cookie", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: "unsupported" })),
    });
    const { getRequestLocale } = await import(
      "@/modules/translation/infrastructure/request-locale"
    );

    await expect(getRequestLocale()).resolves.toBe("ko");
  });
});
