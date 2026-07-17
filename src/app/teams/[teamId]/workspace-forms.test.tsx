import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgressUpdateForm } from "@/app/teams/[teamId]/workspace-forms";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/teams/[teamId]/actions", () => ({
  closeTeamAction: vi.fn(),
  createDiscussionPostAction: vi.fn(),
  createMilestoneAction: vi.fn(),
  createProgressUpdateAction: vi.fn(),
  updateMilestoneStatusAction: vi.fn(),
}));

describe("진행 기록 작성 흐름", () => {
  it("이력 앞에 textarea를 노출하지 않고 작성 모달을 연다", () => {
    render(<ProgressUpdateForm teamId="team" />);

    expect(screen.queryByRole("textbox", { name: "진행 내용" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "진행 기록 추가" }));
    expect(screen.getByRole("dialog", { name: "진행 기록 추가" })).toHaveAttribute("open");
    expect(screen.getByRole("textbox", { name: "진행 내용" })).toBeInTheDocument();
  });
});
