import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { TopicForm } from "@/modules/topic/ui/topic-form";

describe("TopicForm", () => {
  it("학생 제안 모달은 팀 선택, 프로젝트 정보, 확인 단계로만 진행한다", () => {
    const onStepChange = vi.fn();
    const action = vi.fn(async () => ({ status: "idle" as const, message: "" }));
    const { container } = render(
      <TopicForm
        action={action}
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
          projectTeamMinSize: 2,
          projectTeamMaxSize: 6,
          isPublic: true,
          topicCount: 0,
          teamCount: 0,
        }]}
        studentApproval={{ professors: [], studentTeams: [{ id: "team-small", name: "1인 팀", memberCount: 1 }, { id: "team-1", name: "코드웨이브", memberCount: 2 }] }}
        wizard={{ closeHref: "/topics?programId=program-1", createTeamHref: "/teams?modal=create", onStepChange }}
      />,
    );

    expect(onStepChange).toHaveBeenLastCalledWith({ index: 0, labels: ["팀 선택", "프로젝트 정보", "확인 및 제출"] });
    expect(screen.getByRole("heading", { name: "팀 선택" }).closest("section")).toHaveAttribute("data-form-section-appearance", "plain");
    expect(screen.getByText("팀 인원 기준(2–6명)에 맞지 않는 팀 1개는 선택할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "참여 팀" }));
    expect(screen.queryByRole("option", { name: /1인 팀/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /새 팀 만들기/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /코드웨이브/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(action).not.toHaveBeenCalled();
    expect(onStepChange).toHaveBeenLastCalledWith({ index: 1, labels: ["팀 선택", "프로젝트 정보", "확인 및 제출"] });
    expect(screen.getByRole("heading", { name: "프로젝트 정보" })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "프로젝트명" }), { target: { value: "학생 프로젝트" } });
    fireEvent.change(screen.getByRole("textbox", { name: "설명" }), { target: { value: "프로젝트 설명" } });
    expect(screen.queryByRole("button", { name: "프로젝트 제안 제출" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(action).not.toHaveBeenCalled();
    expect(onStepChange).toHaveBeenLastCalledWith({ index: 2, labels: ["팀 선택", "프로젝트 정보", "확인 및 제출"] });
    expect(screen.getByRole("heading", { name: "입력 내용 확인" })).toBeInTheDocument();
    const proposalSubmitButton = screen.getByRole("button", { name: "프로젝트 제안 제출" });
    expect(proposalSubmitButton).toHaveAttribute("type", "button");
    expect(fireEvent.submit(container.querySelector("form")!)).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "입력 내용 확인" })).toBeInTheDocument();
    const review = screen.getByRole("heading", { name: "입력 내용 확인" }).closest("section");
    expect(review).toHaveTextContent("학생 프로젝트");
    expect(review).toHaveTextContent("코드웨이브");
    expect(screen.queryByText("지원 방식")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로젝트 제안 제출" })).toBeInTheDocument();
  });

  it("참여 팀 드롭다운에서 새 팀 만들기를 선택하면 팀 생성 페이지로 이동한다", () => {
    replace.mockReset();
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
          advisorEnabled: false,
          studentProjectCreationEnabled: true,
          projectTeamMinSize: 2,
          projectTeamMaxSize: 6,
          topicCount: 0,
          teamCount: 0,
        }]}
        studentApproval={{ professors: [], studentTeams: [] }}
        wizard={{ closeHref: "/topics?programId=program-1", createTeamHref: "/teams?modal=create" }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "참여 팀" }));
    fireEvent.click(screen.getByRole("option", { name: /새 팀 만들기/ }));

    expect(replace).toHaveBeenCalledWith("/teams?modal=create");
  });

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
          topicCount: 0,
          teamCount: 0,
        }]}
        studentApproval={{ professors: [{ id: "professor-1", name: "김교수", email: "p@example.com" }], studentTeams: [] }}
      />,
    );

    expect(screen.getByText("이 프로그램의 승인 요청은 관리자가 검토합니다.")).toBeInTheDocument();
    expect(container.querySelector('input[name="recruitmentEnabled"]')).toHaveValue("false");
    expect(container.querySelector('input[name="applicationMode"]')).toHaveValue("TEAM_ONLY");
    expect(screen.queryByRole("radio", { name: /교수에게 요청/ })).not.toBeInTheDocument();
    expect(container.querySelector('input[name="approvalRoute"]')).toHaveValue("ADMIN");
    expect(screen.queryByRole("navigation", { name: "프로젝트 작성 섹션" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "지원 조건" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "지원서" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "모집" })).not.toBeInTheDocument();
    expect(container.querySelector("#topic-schedule")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "승인 요청 보내기" }).parentElement).not.toHaveClass("sticky");
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
          topicCount: 0,
          teamCount: 0,
          divisions: [{ id: "division-1", name: "창업", position: 0 }],
        }]}
      />,
    );

    const divisionSelect = screen.getByRole("combobox", { name: "분과" });
    const validationProxy = divisionSelect.parentElement?.querySelector("[data-validation-proxy='custom-select']");
    expect(validationProxy).not.toBeNull();
    fireEvent.invalid(validationProxy!);

    expect(screen.getByRole("alert")).toHaveTextContent("분과를 선택하세요");
  });
});
