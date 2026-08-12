import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DialogBackdropDismissController } from "@/shared/ui/dialog-backdrop-dismiss";

function renderDialog(onCancel?: (event: React.SyntheticEvent<HTMLDialogElement>) => void) {
  const result = render(
    <>
      <DialogBackdropDismissController />
      <dialog open aria-label="테스트 모달" onCancel={onCancel}>
        <button type="button">내부 버튼</button>
      </dialog>
    </>,
  );
  const dialog = result.getByRole("dialog") as HTMLDialogElement;
  vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
    left: 100,
    top: 100,
    right: 500,
    bottom: 400,
    width: 400,
    height: 300,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
  return dialog;
}

function clickAt(dialog: HTMLDialogElement, clientX: number, clientY: number) {
  fireEvent.pointerDown(dialog, { clientX, clientY, pointerId: 1 });
  fireEvent.click(dialog, { clientX, clientY });
}

describe("DialogBackdropDismissController", () => {
  it("native dialog 배경 클릭을 cancel 이벤트를 거쳐 닫는다", () => {
    const onCancel = vi.fn();
    const dialog = renderDialog(onCancel);

    clickAt(dialog, 50, 50);

    expect(onCancel).toHaveBeenCalledOnce();
    expect(dialog).not.toHaveAttribute("open");
  });

  it("dialog 내부 표면을 클릭하면 닫지 않는다", () => {
    const onCancel = vi.fn();
    const dialog = renderDialog(onCancel);

    clickAt(dialog, 200, 200);

    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute("open");
  });

  it("내부에서 시작한 포인터가 배경에서 끝나도 닫지 않는다", () => {
    const onCancel = vi.fn();
    const dialog = renderDialog(onCancel);

    fireEvent.pointerDown(dialog, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.click(dialog, { clientX: 50, clientY: 50 });

    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute("open");
  });

  it("cancel 이벤트가 취소되면 dialog를 닫지 않는다", () => {
    const dialog = renderDialog((event) => event.preventDefault());

    clickAt(dialog, 50, 50);

    expect(dialog).toHaveAttribute("open");
  });
});
