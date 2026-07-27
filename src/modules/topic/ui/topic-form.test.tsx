import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { TopicForm } from "@/modules/topic/ui/topic-form";

describe("TopicForm", () => {
  it("지도교수가 없는 프로그램은 관리자 승인 경로만 제출한다", () => {
    const { container } = render(
      <TopicForm
        action={vi.fn(async () => ({ status: "idle" as const, message: "" }))}
        defaultProgramId="program-1"
        programs={[{
          id: "program-1",
          academicCycleId: "cycle-1",
          academicYear: 2026,
          term: "FIRST",
          name: "창의융합 해커톤",
          category: "대회",
          description: "설명",
          startsAt: new Date("2026-07-01T00:00:00Z"),
          endsAt: new Date("2026-12-31T00:00:00Z"),
          advisorEnabled: false,
          studentProjectCreationEnabled: true,
          status: "OPEN",
          openedAt: new Date("2026-07-01T00:00:00Z"),
          topicCount: 0,
          teamCount: 0,
        }]}
        studentApproval={{ professors: [{ id: "professor-1", name: "김교수", email: "p@example.com" }], studentTeams: [] }}
      />,
    );

    expect(screen.getByText("지도교수가 없는 프로그램이므로 관리자 그룹에 검토를 요청합니다.")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /교수에게 요청/ })).not.toBeInTheDocument();
    expect(container.querySelector('input[name="approvalRoute"]')).toHaveValue("ADMIN");
  });
});
