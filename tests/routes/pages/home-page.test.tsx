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

  it("비로그인 사용자에게 서비스 목적을 안내한다", async () => {
    getCurrentActorMock.mockResolvedValue(null);
    render(await Home());

    expect(
      screen.getByRole("heading", {
        name: "가능성을 프로젝트로",
      }),
    ).toBeInTheDocument();
  });

  it("로그인 사용자를 프로젝트 탐색으로 보낸다", async () => {
    getCurrentActorMock.mockResolvedValue({ id: "user" });

    await Home();

    expect(redirectMock).toHaveBeenCalledWith("/topics");
  });
});
