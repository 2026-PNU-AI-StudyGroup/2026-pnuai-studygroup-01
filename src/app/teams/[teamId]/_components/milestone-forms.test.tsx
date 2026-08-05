import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MilestoneStatusForm } from "@/app/teams/[teamId]/_components/milestone-forms";

const { updateMilestone } = vi.hoisted(() => ({ updateMilestone: vi.fn() }));

vi.mock("@/app/teams/[teamId]/_actions/team-workspace-actions", () => ({
  createMilestoneAction: vi.fn(),
  updateMilestoneStatusAction: updateMilestone,
}));

const members = [
  { id: "student-1", name: "정하늘" },
  { id: "student-2", name: "윤서준" },
];

describe("MilestoneStatusForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateMilestone.mockReset();
    updateMilestone.mockResolvedValue({ status: "error", message: "마일스톤을 저장하지 못했습니다." });
  });

  afterEach(() => vi.useRealTimers());

  it("상태 자동 저장이 실패하면 낙관적으로 바꾼 값을 마지막 저장값으로 되돌린다", async () => {
    const { container } = render(
      <MilestoneStatusForm
        teamId="team-1"
        milestoneId="milestone-1"
        status="TODO"
        assigneeIds={["student-1"]}
        members={members}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));
    fireEvent.click(screen.getByRole("option", { name: "완료" }));
    expect(container.querySelector<HTMLInputElement>('input[name="status"]')).toHaveValue("DONE");

    await act(async () => vi.advanceTimersByTimeAsync(250));

    expect(updateMilestone).toHaveBeenCalledTimes(1);
    const submitted = updateMilestone.mock.calls[0][1] as FormData;
    expect(submitted.get("status")).toBe("DONE");
    expect(screen.getByRole("alert")).toHaveTextContent("마일스톤을 저장하지 못했습니다.");
    expect(container.querySelector<HTMLInputElement>('input[name="status"]')).toHaveValue("TODO");
  });

  it("담당자 자동 저장이 실패하면 낙관적으로 바꾼 목록도 되돌린다", async () => {
    const { container } = render(
      <MilestoneStatusForm
        teamId="team-1"
        milestoneId="milestone-1"
        status="TODO"
        assigneeIds={["student-1"]}
        members={members}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "담당자" }));
    fireEvent.click(screen.getByRole("option", { name: "윤서준" }));
    expect([...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value)).toEqual([
      "student-1",
      "student-2",
    ]);

    await act(async () => vi.advanceTimersByTimeAsync(250));

    const submitted = updateMilestone.mock.calls[0][1] as FormData;
    expect(submitted.getAll("assigneeIds")).toEqual(["student-1", "student-2"]);
    expect(container.querySelectorAll('input[name="assigneeIds"]')).toHaveLength(1);
    expect(container.querySelector<HTMLInputElement>('input[name="assigneeIds"]')).toHaveValue("student-1");
  });
});
