import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 결과 모달은 열려 있는 동안 폴링으로 서버 데이터를 다시 읽는다. 라우터가 필요하다.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ProjectVoteResultsDialog } from "@/app/topics/_components/project-vote-results-dialog";
import type {
  ProgramVotingResults,
  PublicProgramVotingResults,
} from "@/modules/project-voting/application/manage-project-voting";

const results: ProgramVotingResults = {
  programId: "program-1",
  programName: "2026 캡스톤",
  phase: "OPEN",
  policy: {
    startsAt: new Date("2026-08-01T00:00:00Z"),
    endsAt: new Date("2026-08-31T00:00:00Z"),
    voteLimit: 3,
    voteLimitScope: "PROGRAM",
    selfVotingAllowed: false,
    resultsVisibleDuringVoting: false,
    resultsVisibleAfterVoting: true,
  },
  totalVotes: 15,
  participantCount: 7,
  results: [
    {
      topicId: "topic-fusion-low",
      title: "융합 낮은 프로젝트",
      description: "",
      teamName: "융합 B팀",
      divisionId: "fusion",
      divisionName: "융합",
      divisionPosition: 1,
      voteCount: 2,
      rank: 2,
      voters: [{ id: "voter-1", name: "김학생", email: "student@example.com", role: "STUDENT" }],
    },
    {
      topicId: "topic-startup",
      title: "창업 프로젝트",
      description: "",
      teamName: "창업팀",
      divisionId: "startup",
      divisionName: "창업",
      divisionPosition: 0,
      voteCount: 5,
      rank: 1,
      voters: [],
    },
    {
      topicId: "topic-fusion-high",
      title: "융합 높은 프로젝트",
      description: "",
      teamName: null,
      divisionId: "fusion",
      divisionName: "융합",
      divisionPosition: 1,
      voteCount: 8,
      rank: 1,
      voters: [],
    },
  ],
};

const publicResults: PublicProgramVotingResults = {
  programId: results.programId,
  programName: results.programName,
  phase: "OPEN",
  voteLimitScope: "PROGRAM",
  totalVotes: results.totalVotes,
  results: results.results.map((result) => ({
    topicId: result.topicId,
    title: result.title,
    teamName: result.teamName,
    divisionId: result.divisionId,
    divisionName: result.divisionName,
    divisionPosition: result.divisionPosition,
    voteCount: result.voteCount,
    rank: result.rank,
  })),
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("프로젝트 투표 결과 모달", () => {
  it("관리 화면에서는 전달된 득표현황 문구로 결과 모달을 연다", () => {
    render(<ProjectVoteResultsDialog view={{ mode: "ADMIN", results }} triggerLabel="득표현황" />);

    fireEvent.click(screen.getByRole("button", { name: "득표현황" }));

    expect(screen.getByRole("dialog", { name: "투표 결과" })).toBeInTheDocument();
  });

  it("투표 상태 오른쪽에서 열고 전체 득표수 내림차순 표를 보여준다", () => {
    render(<ProjectVoteResultsDialog view={{ mode: "ADMIN", results }} />);

    fireEvent.click(screen.getByRole("button", { name: "투표 결과" }));
    const dialog = screen.getByRole("dialog", { name: "투표 결과" });
    const table = within(dialog).getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "프로젝트명",
      "분과",
      "팀명",
      "득표수",
    ]);
    const projectRows = within(table).getAllByRole("row").slice(1);
    expect(projectRows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual([
      "융합 높은 프로젝트",
      "창업 프로젝트",
      "융합 낮은 프로젝트",
    ]);
    expect(projectRows[0]).toHaveTextContent("융합팀 미구성8표");
  });

  it("분과별 보기에서는 분과 순서대로 나누고 각 분과 안을 득표순으로 정렬한다", () => {
    render(<ProjectVoteResultsDialog view={{ mode: "ADMIN", results }} />);
    fireEvent.click(screen.getByRole("button", { name: "투표 결과" }));
    fireEvent.click(screen.getByRole("button", { name: "분과별 득표순" }));

    expect(screen.getByRole("button", { name: "전체 득표순" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "분과별 득표순" })).toHaveAttribute("aria-pressed", "true");
    const body = screen.getByRole("table").querySelector("tbody");
    expect(body).not.toBeNull();
    expect(body?.textContent).toMatch(/창업 분과.*창업 프로젝트.*융합 분과.*융합 높은 프로젝트.*융합 낮은 프로젝트/);
  });

  it("프로젝트명을 누르면 투표자의 이름, 이메일과 역할 표를 펼친다", () => {
    render(<ProjectVoteResultsDialog view={{ mode: "ADMIN", results }} />);
    fireEvent.click(screen.getByRole("button", { name: "투표 결과" }));
    const projectButton = screen.getByRole("button", { name: "융합 낮은 프로젝트" });

    fireEvent.click(projectButton);

    expect(projectButton).toHaveAttribute("aria-expanded", "true");
    const voterTable = screen.getAllByRole("table")[1];
    expect(within(voterTable).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "이름",
      "이메일",
      "역할",
    ]);
    expect(voterTable).toHaveTextContent("김학생student@example.com학생");
  });

  it("공개 결과는 집계만 보여주고 프로젝트 행·투표자 정보를 펼치지 않는다", () => {
    render(<ProjectVoteResultsDialog view={{ mode: "PUBLIC", results: publicResults }} />);
    fireEvent.click(screen.getByRole("button", { name: "투표 결과" }));

    expect(screen.getByRole("dialog", { name: "투표 결과" })).toHaveTextContent("총 15표");
    expect(screen.getByRole("rowheader", { name: "융합 낮은 프로젝트" })).not.toHaveAttribute("aria-expanded");
    expect(screen.queryByRole("button", { name: "융합 낮은 프로젝트" })).not.toBeInTheDocument();
    expect(screen.queryByText("김학생")).not.toBeInTheDocument();
    expect(screen.queryByText("student@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText(/투표자/)).not.toBeInTheDocument();
  });

  it("닫으면 모달을 닫고 실행 버튼으로 초점을 돌린다", () => {
    render(<ProjectVoteResultsDialog view={{ mode: "ADMIN", results }} />);
    const trigger = screen.getByRole("button", { name: "투표 결과" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "투표 결과 닫기" }));

    expect(screen.queryByRole("dialog", { name: "투표 결과" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
