import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/topics/_components/topic-application-editor", () => ({
  TopicApplicationEditor: () => <button type="button">지원</button>,
}));
vi.mock("@/app/topics/_components/project-vote-control", () => ({
  ProjectVoteButton: () => null,
  ProjectVoteCountBadge: ({ voteCount }: { voteCount: number }) => <span aria-label={`득표 ${voteCount}표`} />,
  ProjectVoteStatusPill: () => null,
  useProjectVoteSelection: (ballot: unknown) => ({ ballot }),
}));

import { ActiveProjectResults } from "@/app/topics/_components/active-project-results";
import type { PublicTopicPage } from "@/modules/topic/application/topic-ports";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";

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
      authorName: "학생 등록자",
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
      professorName: "김교수",
      startYear: 2026,
      memberCount,
      ownApplicationStatus: null,
    }],
  };
}

function ballot(voteCount: number | null): ProgramVoteBallot {
  return {
    programId: "program-1",
    programName: "캡스톤",
    policy: {
      startsAt: new Date("2026-08-01T00:00:00Z"),
      endsAt: new Date("2026-08-31T00:00:00Z"),
      voteLimit: 3,
      voteLimitScope: "PROGRAM",
      selfVotingAllowed: false,
      resultsVisibleDuringVoting: voteCount !== null,
      resultsVisibleAfterVoting: true,
    },
    phase: "OPEN",
    candidates: [{
      id: topics().items[0].id,
      title: "실내 길찾기",
      description: "설명",
      isSelfProject: false,
      voteCount,
    }],
    selectedTopicIds: [],
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
    const memberBadge = screen.getByText("1 / 4명");
    expect(memberBadge.parentElement).toHaveClass("bg-[var(--success-subtle)]");
    expect(memberBadge).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("모집 중")).toHaveClass("rounded-full", "text-white", "backdrop-blur-sm");
  });

  it("공개된 0표는 표시하고 비공개 null 득표수는 숨긴다", () => {
    const { rerender } = render(
      <ActiveProjectResults topics={topics()} canApply leaderTeams={[]} query="" now={now} ballot={ballot(0)} />,
    );
    expect(screen.getByLabelText("득표 0표")).toBeInTheDocument();

    rerender(<ActiveProjectResults topics={topics()} canApply leaderTeams={[]} query="" now={now} ballot={ballot(null)} />);
    expect(screen.queryByLabelText(/득표 \d+표/)).not.toBeInTheDocument();
  });

  it("모집이 끝난 확정 팀은 진행 중 상태를 이미지에 표시한다", () => {
    const activeTopics = topics();
    activeTopics.items[0].recruitmentEnabled = false;
    activeTopics.items[0].effectiveStatus = "IN_PROGRESS";

    render(<ActiveProjectResults topics={activeTopics} canApply leaderTeams={[]} query="" now={now} />);

    expect(screen.getByText("진행 중")).toBeInTheDocument();
    expect(screen.queryByText("모집 중")).not.toBeInTheDocument();
  });

  it("정원이 차면 지원을 숨긴다", () => {
    render(<ActiveProjectResults topics={topics(4)} canApply leaderTeams={[]} query="" now={now} />);

    expect(screen.queryByRole("button", { name: "지원" })).not.toBeInTheDocument();
    expect(screen.getByText("4 / 4명").parentElement).toHaveClass("bg-[var(--surface-subtle)]");
  });

  it("학생 팀 프로젝트 운영 프로그램에서는 직접 지원을 숨긴다", () => {
    const registrationModeTopics = topics();
    registrationModeTopics.items[0].studentProjectCreationEnabled = true;
    render(<ActiveProjectResults topics={registrationModeTopics} canApply leaderTeams={[]} query="" now={now} />);

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
    const { rerender } = render(<ActiveProjectResults topics={emptyTopics} canApply leaderTeams={[]} programId="program-1" query="" now={now} />);
    expect(screen.getByRole("heading", { name: "아직 공개된 프로젝트가 없습니다" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "필터 초기화" })).not.toBeInTheDocument();

    rerender(<ActiveProjectResults topics={emptyTopics} canApply leaderTeams={[]} programId="program-1" query="길찾기" now={now} />);
    expect(screen.getByRole("heading", { name: "조건에 맞는 프로젝트가 없습니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "필터 초기화" })).toHaveAttribute("href", "/topics?programId=program-1");
  });
});
