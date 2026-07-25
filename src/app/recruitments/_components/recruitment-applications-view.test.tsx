import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecruitmentApplicationsView } from "@/app/recruitments/_components/recruitment-applications-view";

vi.mock("@/app/recruitments/_components/recruitment-decision-form", () => ({
  RecruitmentDecisionForm: () => null,
}));

describe("RecruitmentApplicationsView", () => {
  it("지원자가 없으면 기존 모집 패널 안에서 평면 빈 상태를 보여준다", () => {
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

    const state = screen.getByRole("heading", { name: "아직 지원자가 없습니다" }).closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "embedded");
    expect(state).not.toHaveClass("border");
    expect(state).not.toHaveClass("bg-white");
  });
});
