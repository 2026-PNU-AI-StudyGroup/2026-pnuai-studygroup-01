import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { ProgramVoteResults } from "@/app/topics/_management/program-vote-results";
import type { ProgramVotingResults } from "@/modules/project-voting/application/manage-project-voting";
import { I18nProvider } from "@/shared/i18n/i18n-provider";

const baseResults: ProgramVotingResults = {
  programId: "program-1",
  programName: "캡스톤",
  phase: "UPCOMING",
  policy: {
    startsAt: new Date("2026-08-20T00:00:00Z"),
    endsAt: new Date("2026-08-31T00:00:00Z"),
    voteLimit: 3,
    voteLimitScope: "PROGRAM",
    selfVotingAllowed: false,
    resultsVisibleDuringVoting: false,
    resultsVisibleAfterVoting: true,
  },
  totalVotes: 0,
  participantCount: 0,
  results: [{
    topicId: "topic-1",
    title: "캡스톤 프로젝트",
    description: "프로젝트 설명",
    teamName: "캡스톤팀",
    divisionId: null,
    divisionName: null,
    voteCount: 0,
    rank: 1,
    voters: [],
  }],
};

describe("ProgramVoteResults", () => {
  it("투표 예정 상태에도 정책과 후보 요약을 표시한다", () => {
    render(<ProgramVoteResults results={baseResults} refreshedAt="2026. 8. 19. 12:00:00" policySettingsHref="/topics?programId=program-1&mode=manage&tab=settings#voting-policy" />);

    expect(screen.getAllByText("투표 예정")).toHaveLength(2);
    expect(screen.getByText("프로그램 전체 투표 · 인당 3표")).toBeInTheDocument();
    expect(screen.getByText("후보 프로젝트").parentElement).toHaveTextContent("1개");
    expect(screen.getByText("투표가 시작되면 득표현황을 실시간으로 확인할 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "투표 정책 수정" })).toHaveAttribute("href", "/topics?programId=program-1&mode=manage&tab=settings#voting-policy");
  });

  it("분과별 결과에 섹션별 프로젝트 수와 총 표 수를 표시하고 투표자는 접어 둔다", () => {
    const results: ProgramVotingResults = {
      ...baseResults,
      phase: "OPEN",
      policy: { ...baseResults.policy, voteLimitScope: "DIVISION" },
      totalVotes: 7,
      participantCount: 4,
      results: [
        { ...baseResults.results[0], title: "창업 프로젝트", divisionId: "startup", divisionName: "창업", voteCount: 4, rank: 1, voters: [{ id: "voter-1", name: "김학생", email: "student@example.com", role: "STUDENT" }] },
        { ...baseResults.results[0], topicId: "topic-2", title: "미분과 프로젝트", divisionId: null, divisionName: null, voteCount: 3, rank: 1, voters: [] },
      ],
    };

    render(<ProgramVoteResults results={results} refreshedAt="2026. 8. 20. 12:00:00" policySettingsHref="/topics?programId=program-1&mode=manage&tab=settings#voting-policy" />);

    expect(screen.getByRole("heading", { name: "창업 분과" }).parentElement).toHaveTextContent("프로젝트 1개 · 4표");
    expect(screen.getByRole("heading", { name: "미분과" }).parentElement).toHaveTextContent("프로젝트 1개 · 3표");
    const voterDetails = screen.getByText("투표자 1명 보기").closest("details");
    expect(voterDetails).not.toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "창업 프로젝트" })).toHaveAttribute("href", "/topics/topic-1");
  });

  it("영어에서도 분과 결과 헤더를 division으로 표시한다", () => {
    const results: ProgramVotingResults = {
      ...baseResults,
      phase: "OPEN",
      policy: { ...baseResults.policy, voteLimitScope: "DIVISION" },
      results: [{ ...baseResults.results[0], divisionId: "startup", divisionName: "창업" }],
    };

    render(<I18nProvider locale="en"><ProgramVoteResults results={results} refreshedAt="2026. 8. 20. 12:00:00" policySettingsHref="/topics?programId=program-1&mode=manage&tab=settings#voting-policy" /></I18nProvider>);

    expect(screen.getByRole("heading", { name: "창업 division" })).toBeInTheDocument();
  });
});
