import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { social } = vi.hoisted(() => ({ social: vi.fn(async () => ({ error: null })) }));

vi.mock("@/modules/identity/infrastructure/auth-client", () => ({
  authClient: { signIn: { social } },
}));

import { GoogleSignInButton } from "@/modules/identity/ui/google-sign-in-button";

describe("Google 로그인 진입", () => {
  it("로그인 후 전체 주제 탐색으로 이동한다", async () => {
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole("button", { name: "부산대학교 Google 계정으로 로그인" }));

    await waitFor(() => expect(social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/topics",
    }));
  });

  it("비활성화된 경우 테스트 계정 안내를 표시한다", () => {
    render(<GoogleSignInButton disabled />);

    fireEvent.click(screen.getByRole("button", { name: "부산대학교 Google 계정으로 로그인" }));

    expect(screen.getByRole("tooltip")).toHaveTextContent("테스트 서버에서는 테스트 계정으로 로그인하세요.");
  });
});
