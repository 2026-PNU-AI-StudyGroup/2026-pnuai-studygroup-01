import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecruitmentApplicationsView } from "@/app/recruitments/_components/recruitment-applications-view";

vi.mock("@/app/recruitments/_components/recruitment-decision-form", () => ({
  RecruitmentDecisionForm: () => null,
}));
vi.mock("@/app/_components/translated-text", () => ({
  TranslatedText: ({ text }: { text: string }) => <p>{text}</p>,
}));

describe("RecruitmentApplicationsView", () => {
  it("지원자가 없으면 지원자 카드의 머리를 남긴 채 그 안에 한 줄 빈 상태를 보여준다", () => {
    render(
      <RecruitmentApplicationsView
        actorRole="STUDENT"
        post={{
          id: "post-1",
          teamName: "모두의 길",
          topicTitle: "실내 길찾기",
          title: "현장 조사 팀원 모집",
          content: "현장 조사와 사용자 검증을 함께 진행합니다.",
          status: "OPEN",
          applications: [],
        }}
      />,
    );

    const state = screen.getByText("아직 지원자가 없습니다").closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "compact");
    expect(screen.getByRole("heading", { name: "지원자" })).toBeInTheDocument();
    expect(state).not.toHaveClass("border");
    expect(state).not.toHaveClass("bg-[var(--surface)]");
  });
});
