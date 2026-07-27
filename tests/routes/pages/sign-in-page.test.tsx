import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import SignInPage from "@/app/sign-in/page";

describe("SignInPage", () => {
  beforeEach(() => redirectMock.mockReset());

  it("별도 로그인 화면 대신 사이트 루트로 연결한다", async () => {
    await SignInPage({});
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("로컬 데모 데이터 오류 상태를 통합 로그인 화면으로 전달한다", async () => {
    await SignInPage({
      searchParams: Promise.resolve({ mockLogin: "seed-required" }),
    });
    expect(redirectMock).toHaveBeenCalledWith("/?mockLogin=seed-required");
  });
});
