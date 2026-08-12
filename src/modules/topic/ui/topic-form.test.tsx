import { fireEvent, render, screen } from "@testing-library/react";
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
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          executionStartsAt: new Date("2026-08-01T00:00:00Z"),
          executionEndsAt: new Date("2026-11-30T00:00:00Z"),
          submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
          submissionEndsAt: new Date("2026-12-31T00:00:00Z"),
          advisorEnabled: false,
          studentProjectCreationEnabled: true,
          isPublic: true,
          lifecycleStatus: "ACTIVE",
          topicCount: 0,
          teamCount: 0,
        }]}
        studentApproval={{ professors: [{ id: "professor-1", name: "김교수", email: "p@example.com" }], studentTeams: [] }}
      />,
    );

    expect(screen.getByText("지도교수가 없는 프로그램이므로 관리자에게 검토를 요청합니다.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /지원 안 받기/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /지원 받기/ })).not.toBeChecked();
    expect(screen.queryByRole("radio", { name: /교수에게 요청/ })).not.toBeInTheDocument();
    expect(container.querySelector('input[name="approvalRoute"]')).toHaveValue("ADMIN");
    expect(screen.getByRole("navigation", { name: "프로젝트 작성 섹션" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /기본 정보/ })).toHaveAttribute("href", "#topic-basic");
    expect(screen.getByRole("link", { name: /참여 팀과 승인/ })).toHaveAttribute("href", "#topic-approval");
    expect(screen.queryByRole("heading", { name: "지원 조건" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "지원 방식과 지원서" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "모집 설정" })).not.toBeInTheDocument();
    expect(container.querySelector("#topic-schedule")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /지원 받기/ }));

    expect(screen.getByRole("heading", { name: "지원 조건" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "지원 방식과 지원서" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "모집 설정" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /모집 설정/ })).toHaveAttribute("href", "#topic-schedule");
    expect(screen.getByRole("button", { name: "승인 요청 보내기" }).parentElement).toHaveClass("sticky");
  });

  it("지원서 문항을 작성하고 문항을 추가할 때 기존 입력 문항 내용이 보존된다", () => {
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
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          executionStartsAt: new Date("2026-08-01T00:00:00Z"),
          executionEndsAt: new Date("2026-11-30T00:00:00Z"),
          submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
          submissionEndsAt: new Date("2026-12-31T00:00:00Z"),
          advisorEnabled: true,
          studentProjectCreationEnabled: true,
          isPublic: true,
          lifecycleStatus: "ACTIVE",
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

  it("분과가 있는 프로그램에서 미선택 오류를 분과 필드 아래에 표시한다", () => {
    render(
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
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          executionStartsAt: new Date("2026-08-01T00:00:00Z"),
          executionEndsAt: new Date("2026-11-30T00:00:00Z"),
          submissionStartsAt: new Date("2026-11-01T00:00:00Z"),
          submissionEndsAt: new Date("2026-12-31T00:00:00Z"),
          advisorEnabled: true,
          studentProjectCreationEnabled: true,
          isPublic: true,
          lifecycleStatus: "ACTIVE",
          topicCount: 0,
          teamCount: 0,
          divisions: [{ id: "division-1", name: "창업", position: 0 }],
        }]}
      />,
    );

    const divisionSelect = screen.getByRole("combobox", { name: "분과" });
    const validationProxy = divisionSelect.parentElement?.querySelector(".custom-select__validation-proxy");
    expect(validationProxy).not.toBeNull();
    fireEvent.invalid(validationProxy!);

    expect(screen.getByRole("alert")).toHaveTextContent("분과를 선택하세요");
  });
});
