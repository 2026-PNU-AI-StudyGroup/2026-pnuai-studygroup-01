import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramVotingResultVisibilityFields } from "@/app/topics/_management/program-voting-result-visibility";

describe("투표 결과 공개 설정", () => {
  it("저장된 공개 설정을 버튼과 FormData 필드에 반영한다", () => {
    render(<ProgramVotingResultVisibilityFields defaultDuringVoting defaultAfterVoting={false} />);

    expect(screen.getByRole("button", { name: "투표 중 결과 공개: 공개" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "투표 마감 후 결과 공개: 비공개" })).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector('input[name="resultsVisibleDuringVoting"]')).toHaveValue("true");
    expect(document.querySelector('input[name="resultsVisibleAfterVoting"]')).toHaveValue("false");

    fireEvent.click(screen.getByRole("button", { name: "투표 마감 후 결과 공개: 비공개" }));
    expect(document.querySelector('input[name="resultsVisibleAfterVoting"]')).toHaveValue("true");
  });

  it("투표 기능이 꺼져 있으면 버튼과 제출 필드를 함께 비활성화한다", () => {
    render(<ProgramVotingResultVisibilityFields disabled />);

    expect(screen.getByRole("group", { name: "투표 결과 공개 설정" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "투표 중 결과 공개: 비공개" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "투표 마감 후 결과 공개: 공개" })).toBeDisabled();
    expect(document.querySelector('input[name="resultsVisibleDuringVoting"]')).toBeDisabled();
    expect(document.querySelector('input[name="resultsVisibleAfterVoting"]')).toBeDisabled();
  });
});
