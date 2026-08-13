import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CustomSelect } from "@/shared/ui/custom-select";
import { DateTimeInput } from "@/shared/ui/date-time-input";

const originalShowPopover = HTMLElement.prototype.showPopover;
const originalHidePopover = HTMLElement.prototype.hidePopover;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalShowPopover) HTMLElement.prototype.showPopover = originalShowPopover;
  else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover;
  if (originalHidePopover) HTMLElement.prototype.hidePopover = originalHidePopover;
  else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover;
});

describe("dialog floating controls", () => {
  it("스크롤 dialog 소속을 유지하면서 선택 목록과 달력을 top layer로 연다", async () => {
    const openPopovers = new WeakSet<HTMLElement>();
    const showPopover = vi.fn(function showPopover(this: HTMLElement) {
      openPopovers.add(this);
    });
    const hidePopover = vi.fn(function hidePopover(this: HTMLElement) {
      openPopovers.delete(this);
    });
    Object.defineProperty(HTMLElement.prototype, "showPopover", { configurable: true, value: showPopover });
    Object.defineProperty(HTMLElement.prototype, "hidePopover", { configurable: true, value: hidePopover });
    const nativeMatches = HTMLElement.prototype.matches;
    vi.spyOn(HTMLElement.prototype, "matches").mockImplementation(function matches(this: HTMLElement, selector: string) {
      if (selector === ":popover-open") return openPopovers.has(this);
      return nativeMatches.call(this, selector);
    });

    const { container } = render(
      <dialog open className="overflow-y-auto">
        <CustomSelect
          name="status"
          ariaLabel="상태"
          options={[{ value: "TODO", label: "할 일" }]}
        />
        <DateTimeInput name="dueAt" type="date" aria-label="완료 예정일" />
      </dialog>,
    );
    const dialog = container.querySelector("dialog")!;

    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));
    await waitFor(() => expect(showPopover).toHaveBeenCalledWith());
    const listbox = dialog.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(listbox).toHaveAttribute("popover", "manual");
    expect(listbox.parentElement).toBe(dialog);

    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));
    await waitFor(() => expect(hidePopover).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "완료 예정일" }));
    await waitFor(() => expect(showPopover).toHaveBeenCalledTimes(2));
    const calendar = dialog.querySelector<HTMLElement>('section[role="dialog"]')!;
    expect(calendar).toHaveAttribute("popover", "manual");
    expect(calendar.parentElement).toBe(dialog);
  });
});
