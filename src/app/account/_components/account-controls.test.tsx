import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountControls } from "./account-controls";

const { signOut, replace, refresh } = vi.hoisted(() => ({
  signOut: vi.fn(async () => ({ error: null })),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/auth-client", () => ({ authClient: { signOut } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

describe("계정 세션 제어", () => {
  it("로그아웃 후 공개 홈으로 이동한다", async () => {
    render(<AccountControls />);
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });
});
