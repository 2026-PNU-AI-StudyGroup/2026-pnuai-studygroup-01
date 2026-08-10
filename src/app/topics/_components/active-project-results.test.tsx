import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";

vi.mock("@/app/topics/_components/topic-application-editor", () => ({
  TopicApplicationEditor: () => <button type="button">지원</button>,
}));

const now = new Date("2026-07-27T00:00:00Z");
const ballot: ProgramVoteBallot = {
  programId: "program-1",
  programName: "캡스톤",
  policy: {
    startsAt: new Date("2026-07-01T00:00:00Z"),
    endsAt: new Date("2026-08-31T00:00:00Z"),
    voteLimit: 3,
    selfVotingAllowed: false,
    identityVisibility: "ANONYMOUS",
  },
  phase: "OPEN",
  candidates: [{ id: "50000000-0000-4000-8000-000000000001", title: "실내 길찾기", description: "설명", isSelfProject: false, voteCount: 3 }],
  selectedTopicIds: [],
};

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
      executionStartsAt: new Date("2026-08-01T00:00:00Z"),
      executionEndsAt: new Date("2026-11-30T00:00:00Z"),
      submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
      submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
      authorName: "학생 제안자",
      authorRole: "STUDENT",
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-01T00:00:00Z"),
      programName: "캡스톤",
      programCategory: "교과",
      programStatus: "OPEN",
      advisorEnabled,
      programRecruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
      professorName: advisorEnabled ? "김교수" : null,
      startYear: 2026,
      memberCount: 1,
      ownApplicationStatus: status,
    }],
  };
}

describe("ActiveProjectResults", () => {
  it("투표 기간에는 기존 프로젝트 카드에서 바로 투표할 수 있다", () => {
    render(
      <ActiveProjectResults
        topics={topicsWithStatus("PENDING")}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
        ballot={ballot}
      />,
    );

    expect(screen.queryByText("선택한 프로젝트")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "투표하기" })).toBeInTheDocument();
  });

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

    expect(screen.queryByText("김교수")).not.toBeInTheDocument();
    expect(screen.getByText("설명")).toHaveClass("line-clamp-2");
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

  it("정원이 차면 모집 상태에 현재 인원을 표시하고 지원 버튼을 숨긴다", () => {
    const topics = topicsWithStatus("PENDING");
    topics.items[0] = { ...topics.items[0], memberCount: topics.items[0].capacity };
    render(
      <ActiveProjectResults
        topics={topics}
        canApply
        leaderTeams={[]}
        phase="ACTIVE"
        query=""
        sort="LATEST"
        now={now}
      />,
    );

    expect(screen.getByText("정원 마감 · 4 / 4명")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지원" })).not.toBeInTheDocument();
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
    expect(article.querySelector("[data-project-cover-fallback]")).toHaveTextContent("캡스톤");
    expect(article.querySelector("[data-project-cover] [data-pnu-mark]")).toBeInTheDocument();
    const title = screen.getByRole("heading", { name: "실내 길찾기" });
    const professor = screen.getByText("김교수");
    const description = screen.getByText("설명");
    expect(article).not.toHaveTextContent("교과 · 캡스톤");
    expect(article).not.toHaveTextContent("학생 제안자");
    expect(description).toHaveClass("line-clamp-2");
    expect(title.compareDocumentPosition(professor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(professor.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("모집 중 · 1 / 4명")).toBeInTheDocument();
    expect(article.querySelector("dl")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "필요 기술" })).not.toBeInTheDocument();
    expect(article).not.toHaveTextContent("TypeScript");
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
