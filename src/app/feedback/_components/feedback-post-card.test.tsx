import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/feedback/_components/developer-controls", () => ({
  DeveloperControls: () => null,
}));

import { FeedbackPostCard } from "@/app/feedback/_components/feedback-post-card";

describe("FeedbackPostCard", () => {
  it("긴급 우선순위를 위험 강조 배지로 표시한다", () => {
    render(<FeedbackPostCard post={{
      id: "post-1",
      authorName: "김사용자",
      targetScreen: "COMMON",
      area: "기타",
      type: "BUG",
      priority: "URGENT",
      title: "긴급한 피드백",
      body: "빠르게 확인해 주세요.",
      status: "OPEN",
      resolvedAt: null,
      resolvedByName: null,
      createdAt: new Date("2026-08-07T09:00:00+09:00"),
      comments: [],
    }} />);

    expect(screen.getByText("긴급")).toHaveClass("bg-[var(--danger-subtle)]");
  });
});
