import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecruitmentApplyForm } from "@/app/recruitments/recruitment-forms";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/app/recruitments/actions", () => ({
  applyRecruitmentAction: vi.fn(),
  createRecruitmentPostAction: vi.fn(),
  decideRecruitmentAction: vi.fn(),
}));

describe("팀원 모집 지원 흐름", () => {
  it("목록을 늘리는 details 대신 모집 글 맥락을 유지하는 모달을 연다", () => {
    const { container } = render(<RecruitmentApplyForm postId="post" postTitle="백엔드 개발자 모집" teamName="PNU AI" profile={null} />);

    expect(container.querySelector("details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이 팀에 지원하기" }));
    expect(screen.getByRole("dialog", { name: "백엔드 개발자 모집 지원" })).toHaveAttribute("open");
    expect(screen.getByRole("textbox", { name: "지원 메시지" })).toBeInTheDocument();
  });
});
