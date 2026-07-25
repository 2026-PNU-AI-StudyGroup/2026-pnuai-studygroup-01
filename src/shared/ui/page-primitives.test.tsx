import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState, ProgressBar } from "@/shared/ui/page-primitives";

describe("EmptyState", () => {
  it("패널 내부에서는 외부 카드 장식을 다시 만들지 않는다", () => {
    render(<EmptyState variant="embedded" title="항목이 없습니다" description="새 항목이 생기면 표시됩니다." />);

    const state = screen.getByText("항목이 없습니다").closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "embedded");
    expect(state).not.toHaveClass("rounded-[var(--radius-panel)]");
    expect(state).not.toHaveClass("border");
    expect(state).not.toHaveClass("bg-white");
  });

  it("페이지 빈 상태는 독립된 표면을 유지한다", () => {
    render(<EmptyState title="항목이 없습니다" description="첫 항목을 추가해 주세요." />);

    const state = screen.getByText("항목이 없습니다").closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "page");
    expect(state).toHaveClass("border");
    expect(state).toHaveClass("bg-white");
  });
});

describe("ProgressBar", () => {
  it("진행률을 접근 가능한 범위로 제한한다", () => {
    const { rerender } = render(<ProgressBar value={120} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

    rerender(<ProgressBar value={-10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
