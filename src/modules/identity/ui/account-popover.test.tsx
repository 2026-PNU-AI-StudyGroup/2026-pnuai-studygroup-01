import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { signOut, replace, refresh } = vi.hoisted(() => ({
  signOut: vi.fn(async () => ({ error: null })),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("@/modules/identity/infrastructure/auth-client", () => ({ authClient: { signOut } }));

import { AccountPopover } from "@/modules/identity/ui/account-popover";

describe("AccountPopover", () => {
  it("계정 버튼에서 내 계정 이동과 로그아웃을 바로 제공한다", async () => {
    render(<AccountPopover userName="정하늘" roleLabel="학생" active={false} />);

    fireEvent.click(screen.getByRole("button", { name: "정하늘 계정 메뉴" }));

    expect(screen.getByRole("dialog", { name: "계정 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 계정" })).toHaveAttribute("href", "/account");

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(replace).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("Esc를 누르면 계정 말풍선을 닫고 버튼으로 초점을 돌린다", () => {
    render(<AccountPopover userName="정하늘" roleLabel="학생" active={false} placement="below" />);

    const trigger = screen.getByRole("button", { name: "정하늘 계정 메뉴" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "계정 메뉴" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
