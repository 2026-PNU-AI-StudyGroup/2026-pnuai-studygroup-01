import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SignInPage from "./page";

vi.mock("@/modules/identity/infrastructure/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));

describe("SignInPage", () => {
  it("부산대학교 계정 제한과 로그인 동작을 안내한다", () => {
    render(<SignInPage />);

    expect(
      screen.getByRole("button", {
        name: "부산대학교 Google 계정으로 로그인",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("@pusan.ac.kr")).toBeInTheDocument();
  });
});
