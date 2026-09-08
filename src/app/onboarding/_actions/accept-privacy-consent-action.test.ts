import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  getCurrentActor: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  hasActiveAdvisorInvitation: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet, delete: mocks.cookieDelete }),
}));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor: mocks.getCurrentActor }));
vi.mock("@/modules/advisor/infrastructure/prisma-advisor-invitation-query", () => ({
  hasActiveAdvisorInvitation: mocks.hasActiveAdvisorInvitation,
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { updateMany: mocks.updateMany } },
}));

import { acceptPrivacyConsentAction } from "@/app/onboarding/_actions/accept-privacy-consent-action";
import { ADVISOR_INVITE_PROGRAM_COOKIE } from "@/modules/advisor/domain/advisor-invite-cookie";

function consentForm() {
  const formData = new FormData();
  formData.set("privacyConsent", "on");
  return formData;
}

describe("acceptPrivacyConsentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentActor.mockResolvedValue({ id: "user-1", role: "STUDENT" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.cookieGet.mockReturnValue(undefined);
    mocks.hasActiveAdvisorInvitation.mockResolvedValue(false);
  });

  it("동의를 체크하면 최초 동의 시각을 기록한다", async () => {
    await expect(acceptPrivacyConsentAction(consentForm())).rejects.toThrow("REDIRECT");

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

  it("초대 링크로 들어온 자문위원은 동의 직후 그 프로그램 심사 화면으로 간다", async () => {
    mocks.getCurrentActor.mockResolvedValue({ id: "advisor-1", role: "ADVISOR" });
    mocks.cookieGet.mockReturnValue({ value: "program-1" });
    mocks.hasActiveAdvisorInvitation.mockResolvedValue(true);

    await expect(acceptPrivacyConsentAction(consentForm())).rejects.toThrow("REDIRECT");

    expect(mocks.hasActiveAdvisorInvitation).toHaveBeenCalledWith(expect.anything(), {
      userId: "advisor-1",
      programId: "program-1",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/topics?programId=program-1");
    // 한 번 쓴 쿠키를 남기면 다음 방문에 지난 초대가 되살아난다.
    expect(mocks.cookieDelete).toHaveBeenCalledWith(ADVISOR_INVITE_PROGRAM_COOKIE);
  });

  it("쿠키를 심은 뒤 초대가 회수되면 그 프로그램으로 보내지 않는다", async () => {
    mocks.getCurrentActor.mockResolvedValue({ id: "advisor-1", role: "ADVISOR" });
    mocks.cookieGet.mockReturnValue({ value: "program-1" });
    mocks.hasActiveAdvisorInvitation.mockResolvedValue(false);

    await expect(acceptPrivacyConsentAction(consentForm())).rejects.toThrow("REDIRECT");

    expect(mocks.redirect).toHaveBeenLastCalledWith("/onboarding");
    expect(mocks.cookieDelete).toHaveBeenCalledWith(ADVISOR_INVITE_PROGRAM_COOKIE);
  });

  it("자문위원이 아닌 사용자의 쿠키는 심사 화면 근거로 쓰지 않는다", async () => {
    // 쿠키는 서버만 쓰지만, 역할까지 확인해야 다른 역할이 남은 쿠키를 타고 들어오지 못한다.
    mocks.cookieGet.mockReturnValue({ value: "program-1" });
    mocks.hasActiveAdvisorInvitation.mockResolvedValue(true);

    await expect(acceptPrivacyConsentAction(consentForm())).rejects.toThrow("REDIRECT");

    expect(mocks.hasActiveAdvisorInvitation).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenLastCalledWith("/onboarding");
  });

  it("초대 쿠키가 없으면 기존 흐름을 그대로 따른다", async () => {
    mocks.getCurrentActor.mockResolvedValue({ id: "advisor-1", role: "ADVISOR" });

    await expect(acceptPrivacyConsentAction(consentForm())).rejects.toThrow("REDIRECT");

    expect(mocks.redirect).toHaveBeenLastCalledWith("/onboarding");
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });
});
