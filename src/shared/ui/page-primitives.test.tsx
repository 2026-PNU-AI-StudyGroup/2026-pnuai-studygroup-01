import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState, PageHeader, ProgressBar } from "@/shared/ui/page-primitives";

describe("PageHeader", () => {
  it("부제 없이 제목만 렌더링할 수 있다", () => {
    const { container } = render(<PageHeader title="공지사항" />);

    expect(screen.getByRole("heading", { level: 1, name: "공지사항" })).toBeInTheDocument();
    expect(container.querySelector("header p")).not.toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("결과 빈 상태는 외곽 카드 없이 충분한 여백을 둔다", () => {
    render(<EmptyState title="항목이 없습니다" description="새 항목이 생기면 표시됩니다." />);

    const state = screen.getByText("항목이 없습니다").closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "results");
    expect(state).toHaveAttribute("role", "status");
    expect(state).toHaveClass("min-h-44", "text-center");
    expect(screen.getByText("항목이 없습니다").tagName).toBe("H2");
    expect(state?.className).not.toContain("border");
    expect(state?.className).not.toContain("bg-");
  });

  it("패널 내부 빈 상태는 부모 표면을 다시 만들지 않는다", () => {
    render(<EmptyState variant="section" title="항목이 없습니다" description="첫 항목을 추가해 주세요." />);

    const state = screen.getByText("항목이 없습니다").closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "section");
    expect(state).toHaveClass("min-h-28", "text-center");
    expect(screen.getByText("항목이 없습니다").tagName).toBe("H3");
    expect(state?.className).not.toContain("border");
    expect(state?.className).not.toContain("bg-");
  });

  it("작은 빈 상태는 문단 제목과 인접 액션을 사용한다", () => {
    render(<EmptyState variant="compact" title="등록된 공지가 없습니다" action={<button>공지 작성</button>} />);

    const state = screen.getByText("등록된 공지가 없습니다").closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "compact");
    expect(state).toHaveClass("min-h-16", "text-left");
    expect(screen.getByText("등록된 공지가 없습니다").tagName).toBe("P");
    expect(screen.getByRole("button", { name: "공지 작성" })).toBeInTheDocument();
  });

  it("설명이 없으면 빈 설명 문단을 만들지 않는다", () => {
    const { container } = render(<EmptyState variant="section" title="등록된 공지가 없습니다" />);

    expect(container.querySelectorAll("p")).toHaveLength(0);
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
