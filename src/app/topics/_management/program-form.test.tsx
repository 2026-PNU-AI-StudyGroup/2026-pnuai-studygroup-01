import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/app/topics/_management/program-actions", () => ({
  createProgramAction: vi.fn(async () => ({ status: "idle", message: "" })),
}));

import { ProgramForm } from "@/app/topics/_management/program-form";

describe("ProgramForm", () => {
  function renderForm() {
    return render(<ProgramForm categoryOptions={["캡스톤", "해커톤"]} cancelHref="/topics/manage/program-1" />);
  }

  it("기본 정보에 분과 설정을 포함하고 채점표·보고서까지 6단계로 탐색한다", () => {
    renderForm();

    const navigation = screen.getByRole("navigation", { name: "프로그램 등록 항목" });
    expect(navigation).toContainElement(screen.getByRole("button", { name: "기본 정보" }));
    expect(screen.getByRole("button", { name: "기본 정보" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "기본 정보" })).toHaveTextContent("1. 기본 정보");
    expect(screen.queryByRole("button", { name: "분과 설정" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "비공개" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "전체 공개" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "전체 공개" }));
    expect(screen.getByRole("radio", { name: "전체 공개" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "분과 이름" })).toHaveAttribute("placeholder", "예: 창업 트랙, 융합 트랙");
    expect(screen.getByRole("button", { name: "운영 설정" })).toHaveAttribute("aria-controls", "program-operation");
    expect(screen.getByRole("button", { name: "운영 설정" })).toHaveTextContent("2. 운영 설정");
    expect(screen.getByRole("button", { name: "일정" })).toHaveAttribute("aria-controls", "program-schedule");
    expect(screen.getByRole("button", { name: "일정" })).toHaveTextContent("3. 일정");
    expect(screen.getByRole("button", { name: "운영 설정" })).toHaveAttribute("aria-controls", "program-operation");
    expect(screen.getByRole("button", { name: "투표" })).toHaveAttribute("aria-controls", "program-voting");
    expect(screen.getByRole("button", { name: "채점표" })).toHaveAttribute("aria-controls", "program-rubrics");
    expect(screen.getByRole("button", { name: "보고서" })).toHaveAttribute("aria-controls", "program-reports");
    expect(screen.getByRole("heading", { name: "1. 기본 정보" }).closest("section")).toHaveAttribute("id", "program-basic");
    expect(document.querySelectorAll("[data-form-section='program-create']")).toHaveLength(6);
    expect(document.querySelector('input[name="rubricDefinitions"]')).toHaveValue("[]");
    expect(document.querySelector('input[name="reportDefinitions"]')).toHaveValue("[]");

    fireEvent.click(screen.getByRole("button", { name: "채점표" }));
    expect(screen.getByRole("heading", { name: "5. 채점표 (선택)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "보고서" }));
    expect(screen.getByRole("heading", { name: "6. 보고서 (선택)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "기본 정보" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("heading", { name: "2. 운영 설정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전" })).toBeInTheDocument();
  });

  it("관리자가 프로그램 생성 시 지도교수 운영 여부를 명시적으로 지정한다", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "운영 설정" }));

    expect(screen.getByRole("radio", { name: "지도교수 있음" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "지도교수 없음" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "지도교수 있음" }));
    expect(screen.getByRole("radio", { name: "지도교수 있음" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "기본 정보" }));
    fireEvent.click(screen.getByRole("button", { name: "운영 설정" }));
    expect(screen.getByRole("radio", { name: "지도교수 있음" })).toBeChecked();
  });

  it("별도 학기 설정 없이 운영 시작과 종료를 입력한다", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "일정" }));

    expect(screen.queryByRole("combobox", { name: "학기" })).not.toBeInTheDocument();
    expect(screen.getByText("전체 운영 기간")).toBeInTheDocument();
    expect(screen.getByText("세부 일정")).toBeInTheDocument();
    expect(document.querySelector('input[name="startsAt"]')).toBeRequired();
    expect(document.querySelector('input[name="endsAt"]')).toBeRequired();
    expect(screen.getByRole("button", { name: "운영 시작" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByRole("button", { name: "운영 종료" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(document.querySelector('input[name="projectRegistrationStartsAt"]')).toBeRequired();
    expect(document.querySelector('input[name="recruitmentStartsAt"]')).toBeRequired();
    expect(document.querySelector('input[name="executionStartsAt"]')).toBeRequired();
    expect(document.querySelector('input[name="submissionStartsAt"]')).not.toBeInTheDocument();
    expect(document.querySelector('input[name="submissionEndsAt"]')).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("아이콘 선택 UI 없이 기본 아이콘 계약을 유지한다", () => {
    renderForm();

    expect(screen.queryByRole("group", { name: "프로그램 아이콘" })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="hidden"][name="icon"]')).toHaveValue("FOLDER");
  });

  it("채점표 단계는 빈 항목이 있어도 다음 단계로 이동하고 최종 등록에서만 검사한다", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "채점표" }));
    const nextButton = screen.getByRole("button", { name: "다음" });
    fireEvent.click(nextButton);

    expect(screen.getByRole("heading", { name: "6. 보고서 (선택)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로그램 등록" })).not.toBe(nextButton);
    expect(screen.queryByText(/채점표에 평가 항목을 하나 이상 추가/)).not.toBeInTheDocument();
  });

  it("투표를 켰을 때만 세부 설정을 표시하고 분과 추가 상태를 연동한다", () => {
    renderForm();

    fireEvent.change(screen.getByRole("textbox", { name: "분과 이름" }), { target: { value: "창업" } });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "분과 이름" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "투표" }));
    expect(screen.queryByRole("button", { name: /투표 시작/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /프로젝트 투표 사용/ }));
    expect(screen.getByRole("button", { name: /투표 시작/ })).toBeInTheDocument();
    expect(screen.queryByText("프로그램 심사·선정에 투표를 사용할지 설정하세요.")).not.toBeInTheDocument();
    expect(screen.queryByText("활성 사용자 전체가 공개 이력이 있는 프로젝트에 투표할 수 있습니다.")).not.toBeInTheDocument();
    expect(screen.queryByText("사용자가 한 번에 투표할 수 있는 최대 개수")).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "인당 가능 투표수" })).toHaveValue(3);
    expect(screen.queryByRole("button", { name: /인당 가능 투표수 (줄이기|늘리기)/ })).not.toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "투표 범위" })).toHaveTextContent("투표 범위");
    const duringVotingResultVisibility = screen.getByRole("button", { name: "투표 중 결과 공개: 비공개" });
    const afterVotingResultVisibility = screen.getByRole("button", { name: "투표 마감 후 결과 공개: 공개" });
    expect(duringVotingResultVisibility).toHaveAttribute("aria-pressed", "false");
    expect(afterVotingResultVisibility).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector('input[name="resultsVisibleDuringVoting"]')).toHaveValue("false");
    expect(document.querySelector('input[name="resultsVisibleAfterVoting"]')).toHaveValue("true");
    fireEvent.click(duringVotingResultVisibility);
    expect(screen.getByRole("button", { name: "투표 중 결과 공개: 공개" })).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector('input[name="resultsVisibleDuringVoting"]')).toHaveValue("true");
    const divisionScope = screen.getByRole("radio", { name: /분과별/ });
    expect(divisionScope).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "자기 프로젝트 투표 허용" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "기본 정보" }));
    expect(screen.getByRole("button", { name: "창업 삭제" })).toBeInTheDocument();
    expect(document.querySelector('input[type="hidden"][name="divisionNames"]')).toHaveValue("창업");
    fireEvent.click(screen.getByRole("button", { name: "창업 삭제" }));
    expect(document.querySelector('input[type="hidden"][name="divisionNames"]')).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "투표" }));
    expect(screen.getByRole("radio", { name: /분과별/ })).toBeDisabled();
    expect(screen.getByText("분과를 추가하면 분과별 투표를 선택할 수 있습니다.")).toBeInTheDocument();
  });

  it("직접 지원을 기본값으로 두고 학생 제안형에서는 최소 2명, 최대 6명을 설정한다", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "운영 설정" }));

    expect(screen.getByRole("radio", { name: "등록 프로젝트 직접 지원" })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "팀 최대 인원" })).toHaveValue(6);
    expect(screen.queryByRole("spinbutton", { name: "팀 최소 인원" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /팀 최대 인원 (줄이기|늘리기)/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "학생 팀 프로젝트 제안" }));
    expect(screen.getByRole("spinbutton", { name: "팀 최소 인원" })).toHaveValue(2);
    expect(screen.getByRole("spinbutton", { name: "팀 최대 인원" })).toHaveValue(6);
    expect(screen.getByRole("group", { name: "팀 인원" })).toHaveTextContent("~");
    fireEvent.click(screen.getByRole("button", { name: "일정" }));
    expect(screen.queryByText("모집 기간")).not.toBeInTheDocument();
    expect(document.querySelector('input[name="recruitmentStartsAt"]')).not.toBeInTheDocument();
    expect(document.querySelector('input[name="recruitmentEndsAt"]')).not.toBeInTheDocument();
  });

  it("명시적인 목적지로 돌아가는 취소 버튼을 sticky action bar에 둔다", () => {
    renderForm();

    expect(screen.getByRole("link", { name: "프로그램 생성을 취소하고 관리 화면으로 돌아가기" })).toHaveAttribute(
      "href",
      "/topics/manage/program-1",
    );
    const actionBar = document.querySelector("[data-program-form-actions]");
    expect(actionBar).toContainElement(screen.getByRole("button", { name: "다음" }));
    expect(screen.queryByRole("button", { name: "프로그램 등록" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "보고서" }));
    expect(actionBar).toContainElement(screen.getByRole("button", { name: "프로그램 등록" }));
    fireEvent.click(screen.getByRole("button", { name: "프로그램 등록" }));
    expect(screen.getByRole("heading", { name: "1. 기본 정보" })).toBeInTheDocument();
    expect(screen.getByText("입력하지 않았거나 올바르지 않은 필수 항목을 확인해 주세요.")).toHaveAttribute("role", "alert");
  });
});
