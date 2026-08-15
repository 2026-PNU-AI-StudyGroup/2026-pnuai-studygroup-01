import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { EmptyState } from "@/shared/ui/page-primitives";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("TeamModal", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.restoreAllMocks();
  });

  it("모달 내부 빈 상태가 별도 카드 표면을 중첩하지 않는다", () => {
    render(
      <TeamModal title="받은 팀 초대">
        <EmptyState variant="section" title="응답할 초대가 없습니다" description="새 초대가 오면 표시됩니다." />
      </TeamModal>,
    );

    const state = screen.getByRole("heading", { name: "응답할 초대가 없습니다" }).closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "section");
    expect(state).not.toHaveClass("border");
    expect(state).not.toHaveClass("bg-white");
  });

  it("네이티브 모달로 열고 닫힌 뒤 원래 위치로 포커스를 돌린다", () => {
    const previous = document.createElement("button");
    previous.textContent = "모달 열기";
    document.body.append(previous);
    previous.focus();
    const { unmount } = render(
      <TeamModal title="새 팀 만들기">
        <form>
          <label>팀 이름<input aria-label="팀 이름" /></label>
          <button type="button">저장</button>
        </form>
      </TeamModal>,
    );

    const close = screen.getByRole("button", { name: "닫기" });
    const dialog = screen.getByRole("dialog", { name: "새 팀 만들기" });
    expect(dialog).toHaveAttribute("open");
    expect(close).toHaveFocus();

    unmount();
    expect(previous).toHaveFocus();
    previous.remove();
  });

  it("작성한 내용이 있으면 이탈 전에 확인한다", () => {
    render(
      <TeamModal title="새 팀 만들기" closeHref="/teams">
        <form><input aria-label="팀 이름" name="name" /></form>
      </TeamModal>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "팀 이름" }), { target: { value: "코드웨이브" } });
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.getByRole("alertdialog", { name: "작성 중인 내용 삭제" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "계속" }));
    expect(replace).toHaveBeenCalledWith("/teams");
  });

  it("입력 변경이 없으면 추가 확인 없이 닫는다", () => {
    render(<TeamModal title="받은 팀 초대" closeHref="/teams"><p>초대가 없습니다.</p></TeamModal>);

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/teams");
  });
});
