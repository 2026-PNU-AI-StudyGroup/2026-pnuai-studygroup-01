import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActorMock, redirectMock } = vi.hoisted(() => ({
  getCurrentActorMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({
  getCurrentActor: getCurrentActorMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import Home from "@/app/page";

describe("Home", () => {
  beforeEach(() => {
    getCurrentActorMock.mockReset();
    redirectMock.mockReset();
  });

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
    getCurrentActorMock.mockResolvedValue({ id: "user" });

    await Home({});

    expect(redirectMock).toHaveBeenCalledWith("/topics");
  });
});
