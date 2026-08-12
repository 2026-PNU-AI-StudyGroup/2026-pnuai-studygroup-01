import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/feedback/_actions/feedback-actions", () => ({
  addFeedbackCommentAction: vi.fn(async () => ({ status: "idle", message: "" })),
  toggleFeedbackResolvedAction: vi.fn(async () => ({ status: "idle", message: "" })),
}));

import { DeveloperControls } from "@/app/feedback/_components/developer-controls";

describe("DeveloperControls", () => {
  it("운영 처리 폼을 기본적으로 접고 요청할 때만 펼친다", () => {
    const { container } = render(<DeveloperControls postId="post-1" resolved={false} />);
    const details = container.querySelector("details");
    const resolveButton = screen.getByRole("button", { name: "해결 처리" });

    expect(details).not.toHaveAttribute("open");
    expect(resolveButton).not.toBeVisible();

    fireEvent.click(screen.getByText("운영 처리"));

    expect(details).toHaveAttribute("open");
    expect(resolveButton).toBeVisible();
  });
});
