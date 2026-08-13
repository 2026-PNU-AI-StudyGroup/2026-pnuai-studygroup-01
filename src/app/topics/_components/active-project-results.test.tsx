import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/topics/_components/topic-application-editor", () => ({
  TopicApplicationEditor: () => <button type="button">지원</button>,
}));
vi.mock("@/app/topics/_components/project-vote-control", () => ({
  ProjectVoteButton: () => null,
  ProjectVoteStatusPill: () => null,
  useProjectVoteSelection: () => ({ ballot: undefined }),
}));

import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";

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
      status: "ACTIVE",
      effectiveStatus: "FORMING",
      publishedAt: new Date("2026-07-01T00:00:00Z"),
      programName: "캡스톤",
      programCategory: "교과",
      programStatus: "OPEN",
      advisorEnabled: true,
      studentProjectCreationEnabled: false,
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
        registrationAction={<Link href="/projects/new">프로젝트 등록</Link>}
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

  it("학생 팀 프로젝트 운영 프로그램에서는 직접 지원을 숨긴다", () => {
    const proposalModeTopics = topics();
    proposalModeTopics.items[0].studentProjectCreationEnabled = true;
    render(<ActiveProjectResults topics={proposalModeTopics} canApply leaderTeams={[]} query="" now={now} />);

    expect(screen.queryByRole("button", { name: "지원" })).not.toBeInTheDocument();
  });

  it("관리자 카드 데이터가 있을 때만 진행 현황과 연락처 정보를 표시한다", () => {
    const { rerender } = render(
      <ActiveProjectResults topics={topics()} canApply={false} leaderTeams={[]} query="" now={now} />,
    );
    expect(screen.queryByRole("link", { name: "진행 현황" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "연락처 정보" })).not.toBeInTheDocument();

    rerender(
      <ActiveProjectResults
        topics={topics()}
        canApply={false}
        leaderTeams={[]}
        query=""
        now={now}
        adminProjectData={[{
          topicId: topics().items[0].id,
          team: { id: "team-1", name: "알파팀", members: [] },
          reportProgress: { requiredCount: 2, submittedCount: 1, overdueCount: 1 },
        }]}
      />,
    );

    expect(screen.getByRole("link", { name: "진행 현황" })).toHaveAttribute("href", "/projects/50000000-0000-4000-8000-000000000001");
    expect(screen.getByRole("button", { name: "연락처 정보" })).toBeEnabled();
    expect(screen.getByRole("progressbar", { name: "보고서 제출률" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText(/1 \/ 2/)).toHaveTextContent("기한 초과 1건");
  });

  it("팀이 구성되지 않은 관리자 카드에는 보고서 진행 영역을 표시하지 않는다", () => {
    render(
      <ActiveProjectResults
        topics={topics()}
        canApply={false}
        leaderTeams={[]}
        query=""
        now={now}
        adminProjectData={[]}
      />,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("일정 미설정")).not.toBeInTheDocument();
  });

  it("프로그램에 필수 보고서 정의가 없으면 카드에 진행률 영역을 표시하지 않는다", () => {
    render(
      <ActiveProjectResults
        topics={topics()}
        canApply={false}
        leaderTeams={[]}
        query=""
        now={now}
        adminProjectData={[{
          topicId: topics().items[0].id,
          team: { id: "team-1", name: "알파팀", members: [] },
          reportProgress: { requiredCount: 0, submittedCount: 0, overdueCount: 0 },
        }]}
      />,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("보고서 제출률")).not.toBeInTheDocument();
  });

  it("무필터 0건과 필터 0건을 구분하고 모든 조건을 초기화한다", () => {
    const emptyTopics = { ...topics(), items: [], total: 0 };
    const { rerender } = render(<ActiveProjectResults topics={emptyTopics} canApply leaderTeams={[]} query="" now={now} />);
    expect(screen.getByRole("heading", { name: "아직 공개된 프로젝트가 없습니다" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "필터 초기화" })).not.toBeInTheDocument();

    rerender(<ActiveProjectResults topics={emptyTopics} canApply leaderTeams={[]} programId="program-1" query="길찾기" now={now} />);
    expect(screen.getByRole("heading", { name: "조건에 맞는 프로젝트가 없습니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "필터 초기화" })).toHaveAttribute("href", "/topics");
  });
});
