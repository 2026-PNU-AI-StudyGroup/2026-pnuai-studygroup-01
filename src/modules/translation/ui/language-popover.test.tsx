import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguagePopover } from "@/modules/translation/ui/language-popover";

describe("LanguagePopover", () => {
  it("독립 말풍선에서 현재 언어와 선택지를 보여준다", () => {
    render(<LanguagePopover locale="ko" updateLanguage={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "언어 선택" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "언어" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "한국어" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Esc를 누르면 말풍선을 닫고 버튼으로 초점을 돌린다", () => {
    render(<LanguagePopover locale="en" updateLanguage={vi.fn()} placement="below" />);

    const trigger = screen.getByRole("button", { name: "Choose language" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Language" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("말풍선 바깥을 누를 때만 닫는다", () => {
    const { container } = render(
      <LanguagePopover locale="ko" updateLanguage={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "언어 선택" }));
    const dialog = screen.getByRole("dialog", { name: "언어" });

    fireEvent.pointerDown(dialog);
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Enter" });
    expect(dialog).toBeInTheDocument();

    fireEvent.pointerDown(container);
    expect(screen.queryByRole("dialog", { name: "언어" })).not.toBeInTheDocument();
  });

  it("역상 트리거를 다시 누르면 열린 상태를 닫는다", () => {
    render(
      <LanguagePopover locale="en" updateLanguage={vi.fn()} inverse />,
    );

    const trigger = screen.getByRole("button", { name: "Choose language" });
    expect(trigger).toHaveClass("text-[#cbd6ff]");

    fireEvent.click(trigger);
    expect(trigger).toHaveClass("bg-white/16", "text-white");
    expect(screen.getByRole("dialog", { name: "Language" })).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog", { name: "Language" })).not.toBeInTheDocument();
  });
});
