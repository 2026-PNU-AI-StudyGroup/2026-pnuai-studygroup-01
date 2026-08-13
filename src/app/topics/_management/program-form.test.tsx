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
    return render(<ProgramForm categoryOptions={["캡스톤", "해커톤"]} cancelHref="/topics?programId=program-1&mode=manage&tab=overview" />);
  }

  it("기본 정보부터 분과·채점표·보고서까지 생성 단계에서 탐색한다", () => {
    renderForm();

    const navigation = screen.getByRole("navigation", { name: "프로그램 등록 항목" });
    expect(navigation).toContainElement(screen.getByRole("button", { name: "기본 정보" }));
    expect(screen.getByRole("button", { name: "기본 정보" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "분과 설정" })).toHaveAttribute("aria-controls", "program-divisions");
    expect(screen.getByRole("button", { name: "일정" })).toHaveAttribute("aria-controls", "program-schedule");
    expect(screen.getByRole("button", { name: "운영 설정" })).toHaveAttribute("aria-controls", "program-operation");
    expect(screen.getByRole("button", { name: "투표" })).toHaveAttribute("aria-controls", "program-voting");
    expect(screen.getByRole("button", { name: "채점표" })).toHaveAttribute("aria-controls", "program-rubrics");
    expect(screen.getByRole("button", { name: "보고서" })).toHaveAttribute("aria-controls", "program-reports");
    expect(screen.getByRole("heading", { name: "1. 기본 정보" }).closest("section")).toHaveAttribute("id", "program-basic");
    expect(screen.queryByRole("heading", { name: "2. 분과 설정" })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".program-create-form__sections > section")).toHaveLength(7);
    expect(document.querySelector('input[name="rubricDefinitions"]')).toHaveValue("[]");
    expect(document.querySelector('input[name="reportDefinitions"]')).toHaveValue("[]");

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("heading", { name: "2. 분과 설정" })).toBeInTheDocument();
    expect(screen.getByText("2 / 7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전" })).toBeInTheDocument();
  });

  it("관리자가 프로그램 생성 시 지도교수 운영 여부를 명시적으로 지정한다", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "운영 설정" }));

    expect(screen.getByRole("radio", { name: "지도교수 있음" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "지도교수 없음" })).not.toBeChecked();
  });

  it("별도 학기 설정 없이 운영 시작과 종료를 입력한다", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "일정" }));

    expect(screen.queryByRole("combobox", { name: "학기" })).not.toBeInTheDocument();
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

  it("투표를 켰을 때만 세부 설정을 표시하고 분과 추가 상태를 연동한다", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "분과 설정" }));
    fireEvent.change(screen.getByRole("textbox", { name: "분과 이름" }), { target: { value: "창업" } });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "분과 이름" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "투표" }));
    expect(screen.queryByRole("button", { name: /투표 시작/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /프로젝트 투표 사용/ }));
    expect(screen.getByRole("button", { name: /투표 시작/ })).toBeInTheDocument();
    const divisionScope = screen.getByRole("radio", { name: /분과별/ });
    expect(divisionScope).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "분과 설정" }));
    expect(screen.getByRole("button", { name: "창업 삭제" })).toBeInTheDocument();
    expect(document.querySelector('input[type="hidden"][name="divisionNames"]')).toHaveValue("창업");
    fireEvent.click(screen.getByRole("button", { name: "창업 삭제" }));
    expect(document.querySelector('input[type="hidden"][name="divisionNames"]')).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "투표" }));
    expect(screen.getByRole("radio", { name: /분과별/ })).toBeDisabled();
  });

  it("직접 지원을 기본값으로 두고 학생 제안형에서는 최소 2명, 최대 6명을 설정한다", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "운영 설정" }));

    expect(screen.getByRole("radio", { name: "등록 프로젝트 직접 지원" })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "팀 최대 인원" })).toHaveValue(6);
    expect(screen.queryByRole("spinbutton", { name: "팀 최소 인원" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "학생 팀 프로젝트 제안" }));
    expect(screen.getByRole("spinbutton", { name: "팀 최소 인원" })).toHaveValue(2);
    expect(screen.getByRole("spinbutton", { name: "팀 최대 인원" })).toHaveValue(6);
  });

  it("명시적인 목적지로 돌아가는 취소 버튼을 sticky action bar에 둔다", () => {
    renderForm();

    expect(screen.getByRole("link", { name: "프로그램 생성을 취소하고 관리 화면으로 돌아가기" })).toHaveAttribute(
      "href",
      "/topics?programId=program-1&mode=manage&tab=overview",
    );
    expect(document.querySelector(".program-create-form__actions")).toContainElement(screen.getByRole("button", { name: "다음" }));
    expect(screen.queryByRole("button", { name: "프로그램 등록" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "보고서" }));
    expect(document.querySelector(".program-create-form__actions")).toContainElement(screen.getByRole("button", { name: "프로그램 등록" }));
  });
});
