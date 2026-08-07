import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecruitmentPostList } from "@/app/recruitments/_components/recruitment-post-list";

vi.mock("@/app/recruitments/_components/recruitment-apply-form", () => ({
  RecruitmentApplyForm: () => <button type="button">지원하기</button>,
}));
vi.mock("@/app/_components/translated-text", () => ({
  TranslatedText: ({ text, className }: { text: string; className?: string }) => <p className={className}>{text}</p>,
}));

describe("RecruitmentPostList", () => {
  it("팀 정원 정보를 현재 인원과 목표 인원 한 표현으로만 표시한다", () => {
    const { container } = render(
      <RecruitmentPostList
        actorId="student-1"
        profile={null}
        data={{
          page: 1,
          totalPages: 1,
          total: 1,
          posts: [{
            id: "post-1",
            teamId: "team-1",
            teamName: "모두의 길",
            topicTitle: "실내 길찾기",
            authorId: "student-2",
            authorName: "김하늘",
            title: "프론트엔드 팀원 모집",
            content: "사용자 화면을 함께 구현할 팀원을 찾습니다.",
            requiredSkills: ["React"],
            roleNeeded: "프론트엔드",
            availability: "평일 저녁",
            memberCount: 2,
            capacity: 4,
            createdAt: new Date("2026-08-01T00:00:00Z"),
            deadlineAt: new Date("2026-08-14T09:00:00Z"),
            canApply: true,
            isMember: false,
            ownApplication: null,
          }],
        }}
      />,
    );

    expect(screen.getAllByText("2/4명")).toHaveLength(1);
    expect(screen.queryByText("2자리 남음")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("모집자 김하늘")).not.toBeInTheDocument();
    expect(screen.queryByText("모집 내용 전체 보기")).not.toBeInTheDocument();
    expect(screen.getByText("React")).not.toHaveClass("truncate");
    expect(screen.getByText("평일 저녁")).not.toHaveClass("truncate");
    expect(Array.from(container.querySelectorAll("div")).some((element) => (
      element.className.includes("min-h-44") || element.className.includes("min-h-[22rem]")
    ))).toBe(false);
    expect(screen.getByRole("button", { name: "지원하기" })).toBeInTheDocument();
  });
});
