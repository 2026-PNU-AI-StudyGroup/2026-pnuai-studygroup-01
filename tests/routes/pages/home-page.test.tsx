import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActorMock, redirectMock, findUnique } = vi.hoisted(() => ({
  getCurrentActorMock: vi.fn(),
  redirectMock: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: getCurrentActorMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { user: { findUnique } },
}));

import Home from "@/app/page";

describe("Home", () => {
  beforeEach(() => {
    getCurrentActorMock.mockReset();
    redirectMock.mockReset();
    findUnique.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("비로그인 사용자에게 단순한 통합 로그인 화면을 제공한다", async () => {
    getCurrentActorMock.mockResolvedValue(null);
    render(await Home({}));

    expect(
      screen.getByRole("heading", {
        name: "로그인",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("부산대학교 계정으로 로그인하세요.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "부산대학교 Google 계정으로 로그인" })).toBeInTheDocument();
    expect(screen.queryByText("프로젝트 흐름")).not.toBeInTheDocument();
  });

  it("로그인 사용자를 프로젝트 찾기로 보낸다", async () => {
    getCurrentActorMock.mockResolvedValue({ id: "user", role: "STUDENT" });
    findUnique.mockResolvedValue({
      privacyConsentAt: new Date("2026-01-01"),
      onboardingRequired: false,
      onboardingCompletedAt: null,
    });

    await Home({});

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user" },
      select: {
        privacyConsentAt: true,
        onboardingRequired: true,
        onboardingCompletedAt: true,
      },
    });
    expect(redirectMock).toHaveBeenCalledWith("/topics");
  });

  it("명시적으로 허용한 목 인증 배포에서는 Google 로그인을 비활성화한다", async () => {
    vi.stubEnv("ENABLE_DEVELOPMENT_MOCK_AUTH", "true");
    getCurrentActorMock.mockResolvedValue(null);

    render(await Home({}));

    expect(screen.getByRole("button", { name: "부산대학교 Google 계정으로 로그인" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: /학생 화면 열기/ })).toBeInTheDocument();
  });
});
