import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SplitDialog } from "@/shared/ui/split-dialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
});

function renderSplitDialog(onRequestClose = vi.fn()) {
  const dialogRef = createRef<HTMLDialogElement>();
  render(
    <SplitDialog
      dialogRef={dialogRef}
      openOnMount
      title="테스트 모달"
      context="테스트 프로젝트"
      description="테스트 설명"
      closeLabel="테스트 닫기"
      onRequestClose={onRequestClose}
    >
      <input type="file" aria-label="파일 선택" />
    </SplitDialog>,
  );
  return { dialog: screen.getByRole("dialog", { name: "테스트 모달" }), onRequestClose };
}

describe("SplitDialog 취소 처리", () => {
  it("파일 선택기의 취소 이벤트가 버블링해도 모달을 닫지 않는다", () => {
    const { onRequestClose } = renderSplitDialog();
    fireEvent(screen.getByLabelText("파일 선택"), new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it("dialog 자체의 취소 이벤트는 모달 닫기를 요청한다", () => {
    const { dialog, onRequestClose } = renderSplitDialog();
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(onRequestClose).toHaveBeenCalledOnce();
  });

  it("데스크톱에서는 제목을 고정하고 부가 내용과 오른쪽 본문을 각각 스크롤한다", () => {
    const { dialog } = renderSplitDialog();
    expect(dialog).toHaveClass("lg:overflow-hidden");
    expect(screen.getByRole("heading", { name: "테스트 모달" }).parentElement).not.toHaveClass("lg:overflow-y-auto");
    expect(screen.getByText("테스트 프로젝트").parentElement).toHaveClass("lg:overflow-y-auto");
    expect(screen.getByLabelText("파일 선택").parentElement).toHaveClass("lg:overflow-y-auto");
  });
});
