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
          startYear: 2026,
          icon: "FOLDER",
          name: "창의융합 해커톤",
          category: "대회",
          description: "설명",
          startsAt: new Date("2026-07-01T00:00:00Z"),
          endsAt: new Date("2026-12-31T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
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

    expect(screen.getByText("지도교수가 없는 프로그램이므로 관리자에게 검토를 요청합니다.")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /교수에게 요청/ })).not.toBeInTheDocument();
    expect(container.querySelector('input[name="approvalRoute"]')).toHaveValue("ADMIN");
    expect(screen.getByRole("navigation", { name: "주제 작성 섹션" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /기본 정보/ })).toHaveAttribute("href", "#topic-basic");
    expect(screen.getByRole("link", { name: /참여 팀과 승인/ })).toHaveAttribute("href", "#topic-approval");
    expect(container.querySelector("#topic-schedule")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인 요청 보내기" }).parentElement).toHaveClass("sticky");
  });

  it("지원서 문항을 작성하고 문항을 추가할 때 기존 입력 문항 내용이 보존된다", async () => {
    const { fireEvent } = await import("@testing-library/react");

    render(
      <TopicForm
        action={vi.fn(async () => ({ status: "error" as const, message: "기간 일정이 올바르지 않습니다." }))}
        defaultProgramId="program-1"
        programs={[{
          id: "program-1",
          startYear: 2026,
          icon: "FOLDER",
          name: "창의융합 해커톤",
          category: "대회",
          description: "설명",
          startsAt: new Date("2026-07-01T00:00:00Z"),
          endsAt: new Date("2026-12-31T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          advisorEnabled: true,
          studentProjectCreationEnabled: true,
          status: "OPEN",
          openedAt: new Date("2026-07-01T00:00:00Z"),
          topicCount: 0,
          teamCount: 0,
        }]}
      />,
    );

    const questionInput = screen.getByPlaceholderText("예: 이 프로젝트에서 해결하고 싶은 문제는 무엇인가요?");
    fireEvent.change(questionInput, { target: { value: "수정된 테스트 질문" } });

    expect(questionInput).toHaveValue("수정된 테스트 질문");

    const addButton = screen.getByRole("button", { name: "문항 추가" });
    fireEvent.click(addButton);

    const inputs = screen.getAllByPlaceholderText("예: 이 프로젝트에서 해결하고 싶은 문제는 무엇인가요?");
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue("수정된 테스트 질문");
  });
});
