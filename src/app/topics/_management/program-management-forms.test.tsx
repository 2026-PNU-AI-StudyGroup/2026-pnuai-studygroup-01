import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgramVotingPanel } from "@/app/topics/_management/program-management-forms";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/topics/_management/program-actions", () => ({ updateProgramVotingPolicyAction: vi.fn() }));

const votingPolicy: ProgramVotingPolicyDetails = {
  startsAt: new Date("2026-08-01T00:00:00Z"),
  endsAt: new Date("2026-08-31T00:00:00Z"),
  voteLimit: 3,
  staffVoteLimit: 5,
  voteLimitScope: "PROGRAM",
  selfVotingAllowed: false,
  resultsVisibleDuringVoting: false,
  resultsVisibleAfterVoting: true,
};

describe("프로그램 투표 설정 패널", () => {
  it("저장 후 서버에서 다시 받은 투표 정책으로 스위치 상태를 동기화한다", async () => {
    const { rerender } = render(<ProgramVotingPanel programId="program-1" votingPolicy={null} divisionCount={0} />);
    const toggle = screen.getByRole("checkbox", { name: "프로젝트 투표 사용" });

    expect(toggle).not.toBeChecked();

    rerender(<ProgramVotingPanel programId="program-1" votingPolicy={votingPolicy} divisionCount={0} />);

    await waitFor(() => expect(toggle).toBeChecked());
  });
});
