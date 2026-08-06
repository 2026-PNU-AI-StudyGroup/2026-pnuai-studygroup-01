import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";

vi.mock("@/app/topics/_components/topic-application-editor", () => ({
  TopicApplicationEditor: () => <button type="button">지원</button>,
}));

const now = new Date("2026-07-27T00:00:00Z");

function topicsWithStatus(status: "PENDING" | "ACCEPTED" | "REJECTED", advisorEnabled = true): PublicTopicPage {
  return {
    page: 1,
    totalPages: 1,
    total: 1,
    counts: { ACTIVE: 1, RECRUITING: 1, CLOSING_SOON: 0 },
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
      recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
      recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
      executionStartsAt: new Date("2026-08-01T00:00:00Z"),
      executionEndsAt: new Date("2026-11-30T00:00:00Z"),
      submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
      submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
      authorName: "김교수",
      authorRole: "PROFESSOR",
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-01T00:00:00Z"),
      programName: "캡스톤",
      programCategory: "교과",
      programStatus: "OPEN",
      advisorEnabled,
      startYear: 2026,
      memberCount: 1,
      ownApplicationStatus: status,
    }],
  };
}

describe("ActiveProjectResults", () => {
  it("참여가 확정된 프로젝트는 비활성 버튼 대신 내 프로젝트 이동 링크를 표시한다", () => {
    render(
      <ActiveProjectResults
        topics={topicsWithStatus("ACCEPTED")}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
      />,
    );

    expect(screen.queryByRole("button", { name: "참여 중" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("href", "/dashboard?view=active");
  });

  it("지도교수가 없는 프로그램의 프로젝트 카드에는 교수 정보를 표시하지 않는다", () => {
    render(
      <ActiveProjectResults
        topics={topicsWithStatus("PENDING", false)}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
      />,
    );

    expect(screen.queryByText("김교수 교수")).not.toBeInTheDocument();
  });

  it("프로젝트 카드 전체 클릭 영역을 제목 기반 상세 링크 하나로 제공한다", () => {
    render(
      <ActiveProjectResults
        topics={topicsWithStatus("PENDING")}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
      />,
    );

    const detailLinks = screen.getAllByRole("link").filter((link) => (
      link.getAttribute("href") === "/topics/50000000-0000-4000-8000-000000000001"
    ));
    expect(detailLinks).toHaveLength(1);
    expect(detailLinks[0]).toHaveAccessibleName("실내 길찾기");
  });

  it("실제 이미지가 없어도 현재 프로젝트의 장식 커버를 유지한다", () => {
    render(
      <ActiveProjectResults
        topics={topicsWithStatus("PENDING")}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
      />,
    );

    const article = screen.getByRole("article");
    expect(article.querySelector("[data-project-cover]")).toBeInTheDocument();
    expect(article.querySelector("p")).toHaveTextContent("교과 · 캡스톤 · 김교수 교수");
    expect(article.querySelector("img")).not.toBeInTheDocument();
    expect(article.querySelectorAll('a[href="/topics/50000000-0000-4000-8000-000000000001"]')).toHaveLength(1);
  });

  it("기본 조회가 비어 있을 때는 무동작 필터 초기화를 표시하지 않는다", () => {
    const emptyTopics: PublicTopicPage = {
      ...topicsWithStatus("PENDING"),
      items: [],
      total: 0,
      counts: { ACTIVE: 0, RECRUITING: 0, CLOSING_SOON: 0 },
    };
    const { rerender } = render(
      <ActiveProjectResults
        topics={emptyTopics}
        canApply
        leaderTeams={[]}
        programId="program-1"
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
      />,
    );

    expect(screen.queryByRole("link", { name: "필터 초기화" })).not.toBeInTheDocument();

    rerender(
      <ActiveProjectResults
        topics={emptyTopics}
        canApply
        leaderTeams={[]}
        programId="program-1"
        phase="ACTIVE"
        query="길찾기"
        sort="LATEST"
        now={now}
      />,
    );

    expect(screen.getByRole("link", { name: "필터 초기화" })).toHaveAttribute("href", "/topics?phase=ACTIVE&programId=program-1");

    for (const filters of [
      { programId: "program-1", phase: "RECRUITING" as const, query: "", sort: "LATEST" as const },
      { programId: "program-1", phase: "ACTIVE" as const, query: "", sort: "DEADLINE" as const },
    ]) {
      rerender(
        <ActiveProjectResults
          topics={emptyTopics}
          canApply
          leaderTeams={[]}
          {...filters}
          now={now}
        />,
      );
      expect(screen.getByRole("link", { name: "필터 초기화" })).toHaveAttribute("href", "/topics?phase=ACTIVE&programId=program-1");
    }

    rerender(
      <ActiveProjectResults
        topics={emptyTopics}
        canApply
        leaderTeams={[]}
        programId="program-1"
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
      />,
    );
    expect(screen.queryByRole("link", { name: "필터 초기화" })).not.toBeInTheDocument();
  });
});
