import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/feedback/_actions/feedback-actions", () => ({
  createFeedbackPostAction: vi.fn(async () => ({ status: "idle", message: "" })),
}));

import { FeedbackComposer } from "@/app/feedback/_components/feedback-composer";

describe("FeedbackComposer", () => {
  it("작은 선택지는 ChoiceCard로, 긴 관련 기능 목록은 FormData를 유지하는 Combobox로 이관한다", () => {
    const { container } = render(<FeedbackComposer />);
    const pageHeader = screen.getByRole("heading", { level: 1, name: "피드백 게시판" }).closest("header")!;
    const writeButton = within(pageHeader).getByRole("button", { name: "게시글 쓰기" });

    fireEvent.click(writeButton);

    const form = container.querySelector("form")!;
    expect(screen.queryByRole("combobox", { name: "대상 화면" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "관련 기능" })).toBeInTheDocument();
    expect(new FormData(form).get("targetScreen")).toBe("STUDENT");
    expect(new FormData(form).get("area")).toBe("프로젝트 탐색·지원");
    expect(new FormData(form).get("type")).toBe("FEATURE");
    expect(new FormData(form).get("priority")).toBe("NORMAL");

    fireEvent.click(screen.getByRole("radio", { name: /관리자 화면/ }));
    fireEvent.click(screen.getByRole("radio", { name: /버그 수정/ }));
    fireEvent.click(screen.getByRole("radio", { name: /긴급/ }));

    expect(new FormData(form).get("targetScreen")).toBe("ADMIN");
    expect(new FormData(form).get("type")).toBe("BUG");
    expect(new FormData(form).get("priority")).toBe("URGENT");
  });
});
