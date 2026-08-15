import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import styles from "@/app/topics/_components/project-gallery.module.css";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";

const project: ArchivedProject = {
  id: "project-1",
  topicId: "50000000-0000-4000-8000-000000000001",
  startYear: 2025,
  teamName: "모두의 길",
  programId: "program-1",
  programName: "CSE 캡스톤디자인 2025",
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
  it("투표 중인 과거 프로젝트 카드에서도 바로 투표할 수 있다", () => {
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
    expect(screen.getByRole("button", { name: "투표하기" })).toBeInTheDocument();
    const voteCountBadge = screen.getByLabelText("득표 0표");
    expect(voteCountBadge).toHaveClass("absolute", "bottom-3", "right-3", "text-xs");
    expect(voteCountBadge?.closest("[aria-hidden='true']")).toBeNull();
    const voteStatus = screen.getByRole("status", { name: "투표 현황" });
    const total = screen.getByText("1", { selector: "strong" }).closest("p");
    expect(voteStatus.parentElement).toBe(total?.parentElement);
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

  it("썸네일 카드에는 프로젝트의 프로그램·분과 소속을 함께 표시한다", () => {
    render(
      <PastProjectsView
        projects={[project]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const detailLink = screen.getByRole("link", { name: "실내 길찾기" });
    const article = detailLink.closest("article");
    expect(article?.querySelector("[data-project-cover]")).toBeInTheDocument();
    expect(article).toHaveTextContent("CSE 캡스톤디자인 2025 · 융합");
    expect(screen.getByText("완료")).toHaveClass("rounded-full", "text-white", "backdrop-blur-sm");
    expect(article).toHaveTextContent("모두의 길 팀 · 김도윤 교수");
    expect(detailLink).toHaveAttribute(
      "href",
      "/topics/50000000-0000-4000-8000-000000000001",
    );
  });

  it("팀과 지도교수를 한 줄로 표시하고 참여·결과물 정보 박스를 제거한다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, artifacts: [{ id: "artifact-1", type: "POSTER", title: "발표 포스터", position: 0 }] }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const article = screen.getByRole("article");
    const title = screen.getByRole("heading", { name: "실내 길찾기" });
    const team = screen.getByText("모두의 길 팀");
    const teamMeta = team.closest("p");
    const description = screen.getByText("프로젝트 설명");

    expect(teamMeta).toHaveTextContent("모두의 길 팀 · 김도윤 교수");
    expect(article.querySelector("dl")).not.toBeInTheDocument();
    expect(article).not.toHaveTextContent("참여 · 결과물");
    expect(article).not.toHaveTextContent("1명 · 1개");
    expect(title).toHaveClass("line-clamp-2");
    expect(title).not.toHaveClass("min-h-14");
    expect(description).toHaveClass("line-clamp-2");
    expect(description).not.toHaveClass("min-h-12");
    expect(screen.queryByRole("list", { name: "프로젝트 기술" })).not.toBeInTheDocument();
    expect(article).not.toHaveTextContent("TypeScript");
    if (!teamMeta) throw new Error("팀 메타 정보를 찾을 수 없습니다.");
    expect(title.compareDocumentPosition(teamMeta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(teamMeta.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("지도교수가 없는 프로그램은 교수 메타를 숨긴다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, advisorEnabled: false }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    expect(screen.getByText("모두의 길 팀").closest("p")).toHaveTextContent("모두의 길 팀");
    expect(screen.queryByText("김도윤")).not.toBeInTheDocument();
    expect(screen.getByText("프로젝트 설명")).toHaveClass("line-clamp-2");
  });

  it("관리자 연락처 버튼을 카드 전체 링크보다 위의 클릭 레이어에 둔다", () => {
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

    const contactButton = screen.getByRole("button", { name: "연락처 정보" });
    const actionLayer = contactButton.closest(`.${styles.actionLayer}`);
    expect(actionLayer).not.toBeNull();
    expect(actionLayer).toHaveClass("mt-auto");
  });

  it("썸네일이 없는 지난 프로젝트에도 대체 장식 커버를 유지한다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, thumbnailPath: undefined }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const article = screen.getByRole("link", { name: "실내 길찾기" }).closest("article");
    expect(article?.querySelector("[data-project-cover]")).toBeInTheDocument();
    expect(article?.querySelector("[data-project-cover-fallback]")).toBeInTheDocument();
    expect(article?.querySelector("[data-project-cover] [data-pnu-mark]")).toBeInTheDocument();
    expect(article?.querySelector("[data-project-cover-fallback]")).toHaveTextContent("CSE 캡스톤디자인 2025");
    expect(article?.querySelector("img")).not.toBeInTheDocument();
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
