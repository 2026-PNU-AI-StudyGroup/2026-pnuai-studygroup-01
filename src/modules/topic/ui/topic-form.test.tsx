import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { TopicForm } from "@/modules/topic/ui/topic-form";

describe("TopicForm", () => {
  it("학생 등록 모달은 팀 선택, 프로젝트 정보, 확인 단계로만 진행한다", async () => {
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
          startsAt: new Date("2026-07-01T00:00:00Z"),
          endsAt: new Date("2026-12-31T00:00:00Z"),
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          executionStartsAt: new Date("2026-08-01T00:00:00Z"),
          executionEndsAt: new Date("2026-11-30T00:00:00Z"),
          advisorEnabled: false,
          studentProjectCreationEnabled: true,
          projectTeamMinSize: 2,
          projectTeamMaxSize: 6,
          isPublic: true,
          topicCount: 0,
          teamCount: 0,
        }]}
        studentApproval={{
          professors: [],
          studentTeams: [
            { id: "team-small", name: "1인 팀", memberCount: 1, members: [{ id: "student-small", name: "혼자" }] },
            {
              id: "team-1",
              name: "코드웨이브",
              memberCount: 2,
              members: [
                { id: "student-1", name: "김학생" },
                { id: "student-2", name: "이학생" },
              ],
            },
          ],
        }}
        wizard={{ closeHref: "/topics?programId=program-1", createTeamHref: "/teams?modal=create", onStepChange }}
      />,
    );

    expect(onStepChange).toHaveBeenLastCalledWith({ index: 0, labels: ["팀 선택", "프로젝트 정보", "확인 및 제출"] });
    expect(screen.getByRole("heading", { name: "팀 선택" }).closest("section")).toHaveAttribute("data-form-section-appearance", "plain");
    expect(screen.queryByRole("heading", { name: "프로젝트 정보" })).not.toBeInTheDocument();
    expect(screen.getByText("팀 인원 기준(2–6명)에 맞지 않는 팀 1개는 선택할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "참여 팀" }));
    expect(screen.queryByRole("option", { name: /1인 팀/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /새 팀 만들기/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /코드웨이브/ }));
    fireEvent.click(screen.getByRole("combobox", { name: "프로젝트 대표" }));
    fireEvent.click(screen.getByRole("option", { name: "김학생" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(action).not.toHaveBeenCalled();
    await waitFor(() => expect(onStepChange).toHaveBeenLastCalledWith({ index: 1, labels: ["팀 선택", "프로젝트 정보", "확인 및 제출"] }));
    expect(screen.getByRole("heading", { name: "프로젝트 정보" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "팀 선택" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "검토 요청" })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: /프로젝트명/ }), { target: { value: "학생 프로젝트" } });
    fireEvent.change(screen.getByRole("textbox", { name: /설명/ }), { target: { value: "프로젝트 설명" } });
    expect(screen.queryByRole("button", { name: "프로젝트 등록 제출" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(action).not.toHaveBeenCalled();
    await waitFor(() => expect(onStepChange).toHaveBeenLastCalledWith({ index: 2, labels: ["팀 선택", "프로젝트 정보", "확인 및 제출"] }));
    expect(screen.getByRole("heading", { name: "입력 내용 확인" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "프로젝트 정보" })).not.toBeInTheDocument();
    const registrationSubmitButton = screen.getByRole("button", { name: "프로젝트 등록 제출" });
    expect(registrationSubmitButton).toHaveAttribute("type", "button");
    expect(fireEvent.submit(container.querySelector("form")!)).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "입력 내용 확인" })).toBeInTheDocument();
    const review = screen.getByRole("heading", { name: "입력 내용 확인" }).closest("section");
    expect(review).toHaveTextContent("학생 프로젝트");
    expect(review).toHaveTextContent("코드웨이브");
    expect(screen.queryByText("지원 방식")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로젝트 등록 제출" })).toBeInTheDocument();

    action.mockResolvedValueOnce({ status: "success", message: "프로젝트 승인 요청을 보냈습니다." });
    fireEvent.click(registrationSubmitButton);

    await waitFor(() => expect(screen.getByRole("heading", { name: "승인 요청을 보냈습니다" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "검토 중인 프로젝트 보기" }));
    expect(replace).toHaveBeenCalledWith("/dashboard?view=pending");
    expect(screen.queryByRole("button", { name: "프로젝트 준비 공간 열기" })).not.toBeInTheDocument();
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
          startsAt: new Date("2026-07-01T00:00:00Z"),
          endsAt: new Date("2026-12-31T00:00:00Z"),
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          executionStartsAt: new Date("2026-08-01T00:00:00Z"),
          executionEndsAt: new Date("2026-11-30T00:00:00Z"),
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
          startsAt: new Date("2026-07-01T00:00:00Z"),
          endsAt: new Date("2026-12-31T00:00:00Z"),
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          executionStartsAt: new Date("2026-08-01T00:00:00Z"),
          executionEndsAt: new Date("2026-11-30T00:00:00Z"),
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
          startsAt: new Date("2026-07-01T00:00:00Z"),
          endsAt: new Date("2026-12-31T00:00:00Z"),
          recruitmentStartsAt: new Date("2026-07-01T00:00:00Z"),
          recruitmentEndsAt: new Date("2026-08-31T00:00:00Z"),
          executionStartsAt: new Date("2026-08-01T00:00:00Z"),
          executionEndsAt: new Date("2026-11-30T00:00:00Z"),
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
