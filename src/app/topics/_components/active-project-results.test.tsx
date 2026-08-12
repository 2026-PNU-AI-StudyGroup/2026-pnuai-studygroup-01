import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";

vi.mock("@/app/topics/_components/topic-application-editor", () => ({
  TopicApplicationEditor: () => <button type="button">지원</button>,
}));

const now = new Date("2026-07-27T00:00:00Z");

function topics(memberCount = 1): PublicTopicPage {
  return {
    page: 1,
    totalPages: 1,
    total: 1,
    items: [{
      id: "50000000-0000-4000-8000-000000000001",
      programId: "program-1",
      authorId: "professor-1",
      title: "실내 길찾기",
      description: "설명",
      requiredSkills: ["TypeScript"],
      preferredSkills: [],
      roleExpectations: "개발",
      availabilityRequirement: "주 1회",
      applicationMode: "INDIVIDUAL_ONLY",
      recruitmentEnabled: true,
      applicationQuestions: [{ id: "question-1", label: "동기", maxLength: 500, required: true }],
      capacity: 4,
      authorName: "학생 제안자",
      authorRole: "STUDENT",
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-01T00:00:00Z"),
      programName: "캡스톤",
      programCategory: "교과",
      programStatus: "OPEN",
      advisorEnabled: true,
      programRecruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
      programRecruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
      programExecutionStartsAt: new Date("2026-08-01T00:00:00Z"),
      programExecutionEndsAt: new Date("2026-11-30T00:00:00Z"),
      programSubmissionStartsAt: new Date("2026-11-01T00:00:00Z"),
      programSubmissionEndsAt: new Date("2026-12-01T00:00:00Z"),
      professorName: "김교수",
      startYear: 2026,
      memberCount,
      ownApplicationStatus: null,
    }],
  };
}

describe("ActiveProjectResults", () => {
  it("프로젝트 등록 동작을 총 개수 행의 왼쪽에 표시한다", () => {
    render(
      <ActiveProjectResults
        topics={topics()}
        canApply
        leaderTeams={[]}
        query=""
        now={now}
        registrationAction={<a href="/projects/new">프로젝트 등록</a>}
      />,
    );

    const registration = screen.getByRole("link", { name: "프로젝트 등록" });
    const header = registration.parentElement;
    const count = header?.querySelector("p");

    expect(count).toHaveTextContent("총 1개");
    expect(header?.firstElementChild).toBe(registration);
    expect(header?.lastElementChild).toBe(count);
  });

  it("프로그램 공통 모집 기간 안에서만 지원을 표시한다", () => {
    render(<ActiveProjectResults topics={topics()} canApply leaderTeams={[]} query="" now={now} />);

    expect(screen.getByRole("button", { name: "지원" })).toBeInTheDocument();
    expect(screen.getByText("1 / 4명")).toHaveClass("bg-[var(--success-subtle)]");
  });

  it("정원이 차면 지원을 숨긴다", () => {
    render(<ActiveProjectResults topics={topics(4)} canApply leaderTeams={[]} query="" now={now} />);

    expect(screen.queryByRole("button", { name: "지원" })).not.toBeInTheDocument();
    expect(screen.getByText("4 / 4명")).toHaveClass("bg-[var(--surface-subtle)]");
  });

  it("검색 또는 분과가 비어 있으면 필터 초기화 링크를 제공한다", () => {
    const emptyTopics = { ...topics(), items: [], total: 0 };
    const { rerender } = render(<ActiveProjectResults topics={emptyTopics} canApply leaderTeams={[]} programId="program-1" query="" now={now} />);
    expect(screen.queryByRole("link", { name: "필터 초기화" })).not.toBeInTheDocument();

    rerender(<ActiveProjectResults topics={emptyTopics} canApply leaderTeams={[]} programId="program-1" query="길찾기" now={now} />);
    expect(screen.getByRole("link", { name: "필터 초기화" })).toHaveAttribute("href", "/topics?programId=program-1");
  });
});
