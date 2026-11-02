import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const project: ArchivedProject = {
  id: "project-1",
  topicId: "50000000-0000-4000-8000-000000000001",
  startYear: 2025,
  teamName: "모두의 길",
  teamNumber: null,
  programId: "program-1",
  programName: "CSE 캡스톤디자인 2025",
  programIcon: "FOLDER" as const,
  programCategory: "CSE 캡스톤 디자인",
  divisionId: "division-1",
  divisionName: "융합",
  topicTitle: "실내 길찾기",
  topicDescription: "프로젝트 설명",
  professorName: "김도윤",
  advisorRole: "교수",
  advisorEnabled: true,
  memberNames: ["정하늘"],
  thumbnailPath: "/demo/archive/project.png",
  artifacts: [],
};

const ballot: ProgramVoteBallot = {
  programId: "program-1",
  programName: "CSE 캡스톤디자인 2025",
  policy: {
    startsAt: new Date("2026-08-01T00:00:00Z"),
    endsAt: new Date("2026-08-31T00:00:00Z"),
    voteLimit: 3,
    staffVoteLimit: 5,
    selfVotingAllowed: false,
    resultsVisibleDuringVoting: true,
    resultsVisibleAfterVoting: true,
  },
  phase: "OPEN",
  candidates: [{ id: project.topicId, title: project.topicTitle, description: project.topicDescription, isSelfProject: false, voteCount: 0 }],
  selectedTopicIds: [],
};

describe("PastProjectsView", () => {
  beforeEach(() => push.mockClear());

  it("종료 프로그램에서도 분과 필터와 선택 조건을 유지한다", () => {
    render(
      <PastProjectsView
        projects={[project]}
        total={1}
        page={1}
        totalPages={1}
        query="길찾기"
        programId="program-1"
        divisionId="division-1"
        divisions={[{ id: "division-1", name: "융합" }]}
      />,
    );

    expect(screen.getByRole("navigation", { name: "프로젝트 분과" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "융합" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(push).toHaveBeenCalledWith("/topics?view=past&programId=program-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0", { scroll: false });
  });

  it("투표 중인 과거 프로젝트 줄에서도 바로 투표할 수 있다", () => {
    render(
      <PastProjectsView
        projects={[project]}
        total={1}
        page={1}
        totalPages={1}
        query=""
        programId="program-1"
        ballot={ballot}
      />,
    );

    expect(screen.queryByText("선택한 프로젝트")).not.toBeInTheDocument();
    // 줄마다 채운 버튼이면 표보다 시끄러워 테두리 버튼으로 둔다.
    expect(screen.getByRole("button", { name: "투표하기" })).toHaveClass("button-secondary");
    expect(screen.getByLabelText("득표 0표")).toHaveTextContent("0표");
    const voteStatus = screen.getByRole("status", { name: "투표 현황" });
    expect(voteStatus.closest("section")).toBe(screen.getByRole("region", { name: "지난 프로젝트" }));
  });

  it("결과 비공개 투표 용지는 투표 기능만 유지하고 득표 배지를 숨긴다", () => {
    render(
      <PastProjectsView
        projects={[project]}
        total={1}
        page={1}
        totalPages={1}
        query=""
        programId="program-1"
        ballot={{
          ...ballot,
          policy: { ...ballot.policy, resultsVisibleDuringVoting: false },
          candidates: ballot.candidates.map((candidate) => ({ ...candidate, voteCount: null })),
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "투표하기" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/득표 \d+표/)).not.toBeInTheDocument();
  });

  it("한 줄에 사진, 이름과 설명, 팀과 지도교수, 수상, 득표, 저장소를 둔다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, award: "대상", sourceUrl: "https://github.com/pnu/indoor-way" }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const row = screen.getByRole("link", { name: "실내 길찾기" }).closest("li");
    expect(screen.getByRole("link", { name: "실내 길찾기" })).toHaveAttribute("href", "/topics/50000000-0000-4000-8000-000000000001");
    expect(row?.querySelector("img")).toHaveAttribute("src", "/demo/archive/project.png");
    expect(row).toHaveTextContent("프로젝트 설명");
    expect(row).toHaveTextContent("모두의 길");
    expect(row).toHaveTextContent("김도윤 교수");
    expect(screen.getByText("대상")).toHaveClass("bg-[var(--accent-track)]");
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", "https://github.com/pnu/indoor-way");
  });

  it("지도교수가 없는 프로그램은 교수 이름을 숨기고 모르는 값은 자리를 비운다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, advisorEnabled: false }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    expect(screen.getByText("모두의 길")).toBeInTheDocument();
    expect(screen.queryByText(/김도윤/)).not.toBeInTheDocument();
    // 수상, 득표, 저장소가 모두 없으면 줄표 없이 비운다.
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("관리자에게는 줄 끝에 진행 현황과 연락처를 둔다", () => {
    render(
      <PastProjectsView
        projects={[project]}
        total={1}
        page={1}
        totalPages={1}
        query=""
        adminProjectData={[{
          topicId: project.topicId,
          team: { id: project.id, name: project.teamName, members: [] },
          reportProgress: { requiredCount: 0, submittedCount: 0, overdueCount: 0 },
        }]}
      />,
    );

    const row = screen.getByRole("link", { name: "실내 길찾기" }).closest("li");
    expect(row).toContainElement(screen.getByRole("button", { name: "연락처 정보" }));
    expect(row).toContainElement(screen.getByRole("link", { name: "진행 현황" }));
  });

  it("사진이 없는 지난 프로젝트는 회색 판에 사업 아이콘을 둔다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, thumbnailPath: undefined }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const row = screen.getByRole("link", { name: "실내 길찾기" }).closest("li");
    expect(row?.querySelector("img")).not.toBeInTheDocument();
    expect(row?.querySelector("span[aria-hidden='true'] svg")).toBeInTheDocument();
  });

  it("필터 결과가 비어도 같은 초기화 동작을 두 번 표시하지 않는다", () => {
    render(
      <PastProjectsView
        projects={[]}
        total={0}
        page={1}
        totalPages={1}
        query="길찾기"
        programId="program-1"
      />,
    );

    expect(screen.queryByRole("link", { name: "조건 초기화" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "필터 초기화" })).toHaveAttribute("href", "/topics?view=past&programId=program-1");
    expect(screen.queryByRole("link", { name: "전체 프로젝트 보기" })).not.toBeInTheDocument();
  });

  it("프로그램이 선택돼도 검색 조건이 없고 결과가 비면 최초 데이터 안내만 표시한다", () => {
    render(<PastProjectsView projects={[]} total={0} page={1} totalPages={1} query="" programId="program-1" />);

    expect(screen.getByRole("heading", { name: "아직 지난 프로젝트가 없습니다" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "필터 초기화" })).not.toBeInTheDocument();
  });
});
