import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ProjectVoteCountBadge,
  ProjectVoteStatusPill,
  type ProjectVoteSelection,
} from "@/app/topics/_components/project-vote-control";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";

function selection(voteLimitScope: "PROGRAM" | "DIVISION", selectedTopicIds: string[] = []): ProjectVoteSelection {
  const ballot: ProgramVoteBallot = {
    programId: "program-1",
    programName: "캡스톤",
    policy: {
      startsAt: new Date("2026-08-01T00:00:00Z"),
      endsAt: new Date("2026-08-31T00:00:00Z"),
      voteLimit: 3,
      staffVoteLimit: 5,
      voteLimitScope,
      selfVotingAllowed: false,
      resultsVisibleDuringVoting: false,
      resultsVisibleAfterVoting: true,
    },
    phase: "OPEN",
    candidates: [],
    selectedTopicIds,
  };
  return {
    ballot,
    selectedTopicIds: new Set(selectedTopicIds),
    pending: false,
    pendingTopicId: null,
    toggle: () => undefined,
  };
}

describe("프로그램 투표 상태 알약", () => {
  it("득표 배지는 투표함 아이콘과 표 단위를 표시한다", () => {
    render(<ProjectVoteCountBadge voteCount={2} />);

    expect(screen.getByLabelText("득표 2표")).toHaveTextContent("2표");
    expect(screen.getByLabelText("득표 2표").querySelector("svg")).toBeInTheDocument();
  });

  it("프로그램 단위 투표는 현재 선택 수와 한도를 표시한다", () => {
    render(<ProjectVoteStatusPill selection={selection("PROGRAM", ["topic-1"])} />);

    const status = screen.getByRole("status", { name: "투표 현황" });
    expect(status).toHaveTextContent("투표 가능 1/3");
    expect(status).toHaveClass("rounded-full");
  });

  it("분과별 투표는 전체 선택 수 대신 분과별 고정 한도를 표시한다", () => {
    render(<ProjectVoteStatusPill selection={selection("DIVISION", ["topic-1", "topic-2", "topic-3", "topic-4"])} />);

    expect(screen.getByRole("status", { name: "투표 현황" }))
      .toHaveTextContent("투표 가능: 분과별 최대 3표");
  });
});
