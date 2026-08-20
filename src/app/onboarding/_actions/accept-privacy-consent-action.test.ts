import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  getCurrentActor: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: mocks.getCurrentActor }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { updateMany: mocks.updateMany } },
}));

import { acceptPrivacyConsentAction } from "@/app/onboarding/_actions/accept-privacy-consent-action";

describe("acceptPrivacyConsentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentActor.mockResolvedValue({ id: "user-1", role: "STUDENT" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("동의를 체크하면 최초 동의 시각을 기록한다", async () => {
    const formData = new FormData();
    formData.set("privacyConsent", "on");

    await expect(acceptPrivacyConsentAction(formData)).rejects.toThrow("REDIRECT");

    // 이미 동의한 사용자의 최초 시각을 덮어쓰지 않으려고 조건에 null 을 둔다.
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", privacyConsentAt: null },
      data: { privacyConsentAt: expect.any(Date) },
    });
  });

  it("동의 없이 제출하면 아무것도 기록하지 않는다", async () => {
    // 체크박스의 required 는 브라우저 쪽 도움일 뿐이라 서버에서 다시 막아야 한다.
    await expect(acceptPrivacyConsentAction(new FormData())).rejects.toThrow("REDIRECT");

    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
