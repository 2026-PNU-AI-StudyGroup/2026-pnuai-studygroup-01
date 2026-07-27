import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  update: vi.fn(),
  setCookie: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: mocks.setCookie })),
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: mocks.actor,
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { update: mocks.update } },
}));

import { updateLanguageAction } from "@/app/_actions/language-actions";

describe("updateLanguageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({});
  });

  it("ignores unauthenticated requests", async () => {
    mocks.actor.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("locale", "en");

    await updateLanguageAction(formData);

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("rejects unsupported locales without changing persisted state", async () => {
    mocks.actor.mockResolvedValue({ id: "user-1" });
    const formData = new FormData();
    formData.set("locale", "ja");

    await updateLanguageAction(formData);

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("persists the locale, synchronizes its cookie, and revalidates the layout", async () => {
    mocks.actor.mockResolvedValue({ id: "user-1" });
    const formData = new FormData();
    formData.set("locale", "en");

    await updateLanguageAction(formData);

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { preferredLocale: "en" },
    });
    expect(mocks.setCookie).toHaveBeenCalledWith("pms-locale", "en", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
