import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SignInPage from "@/app/sign-in/page";

vi.mock("@/modules/identity/infrastructure/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));

describe("SignInPage", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("부산대학교 계정 제한과 로그인 동작을 안내한다", async () => {
    render(await SignInPage({}));

    expect(
      screen.getByRole("button", {
        name: "부산대학교 Google 계정으로 로그인",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("@pusan.ac.kr")).toBeInTheDocument();
  });

  it("개발 환경에서는 역할별 목 로그인을 제공한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    render(await SignInPage({}));

    expect(screen.getByRole("button", { name: /학생으로 로그인/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /교수로 로그인/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /관리자로 로그인/ })).toBeInTheDocument();
  });
});
