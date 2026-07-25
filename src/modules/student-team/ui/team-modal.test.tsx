import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { EmptyState } from "@/shared/ui/page-primitives";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("TeamModal", () => {
  it("모달 내부 빈 상태가 별도 카드 표면을 중첩하지 않는다", () => {
    render(
      <TeamModal title="받은 팀 초대">
        <EmptyState variant="embedded" title="응답할 초대가 없습니다" description="새 초대가 오면 표시됩니다." />
      </TeamModal>,
    );

    const state = screen.getByRole("heading", { name: "응답할 초대가 없습니다" }).closest("[data-empty-state]");
    expect(state).toHaveAttribute("data-empty-state", "embedded");
    expect(state).not.toHaveClass("border");
    expect(state).not.toHaveClass("bg-white");
  });
});
