import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TranslatedTextClient } from "@/shared/ui/translated-text-client";

describe("저장된 번역 본문", () => {
  it("설정 언어의 번역을 기본 표시하고 아이콘으로 원문을 전환한다", () => {
    const { container } = render(
      <TranslatedTextClient
        original="졸업과제"
        translation="Graduation project"
        locale="en"
        className="mt-5 line-clamp-3 text-sm"
      />,
    );

    const textBlock = container.firstElementChild;
    expect(textBlock).toHaveClass(
      "mt-5",
      "line-clamp-3",
      "text-sm",
      "relative",
      "pr-10",
    );
    expect(textBlock).toHaveTextContent("Graduation project");

    const toggle = screen.getByRole("button", { name: "Show original" });
    expect(toggle).toHaveClass("absolute", "right-0", "top-0", "size-8");
    expect(toggle).not.toHaveClass("mt-2", "size-11");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(textBlock).toHaveTextContent("졸업과제");
    expect(screen.getByRole("button", { name: "Show translation" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Show translation" }));
    expect(textBlock).toHaveTextContent("Graduation project");
  });

  it("번역이 아직 없으면 원문만 표시하고 무의미한 전환 버튼을 숨긴다", () => {
    render(
      <TranslatedTextClient original="졸업과제" translation={null} locale="ko" />,
    );

    expect(screen.getByText("졸업과제")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
