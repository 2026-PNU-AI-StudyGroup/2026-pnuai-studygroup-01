import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/app/admin/programs/_actions/program-actions", () => ({
  createProgramAction: vi.fn(async () => ({ status: "idle", message: "" })),
}));

import { ProgramForm } from "@/app/admin/programs/_components/program-form";

describe("ProgramForm", () => {
  it("관리자가 프로그램 생성 시 지도교수 운영 여부를 명시적으로 지정한다", () => {
    render(<ProgramForm />);

    expect(screen.getByRole("radio", { name: /지도교수 있음/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /지도교수 없음/ })).not.toBeChecked();
  });

  it("별도 학기 설정 없이 운영 시작과 종료를 입력한다", () => {
    render(<ProgramForm />);

    expect(screen.queryByRole("combobox", { name: "학기" })).not.toBeInTheDocument();
    expect(document.querySelector('input[name="startsAt"]')).toBeRequired();
    expect(document.querySelector('input[name="endsAt"]')).toBeRequired();
    expect(screen.getByRole("button", { name: "운영 시작" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByRole("button", { name: "운영 종료" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByRole("button", { name: "프로그램 등록" })).toBeEnabled();
  });

  it("고정 아이콘 목록에서 폴더 아이콘을 기본값으로 선택한다", () => {
    render(<ProgramForm />);

    expect(screen.getByRole("radio", { name: "일반" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "봉사" })).not.toBeChecked();
  });

  it("분과를 추가하기 전에는 분과별 투표를 선택할 수 없다", () => {
    render(<ProgramForm />);
    fireEvent.click(screen.getByRole("checkbox", { name: /프로젝트 투표 사용/ }));
    const divisionScope = screen.getByRole("radio", { name: /분과별/ });
    expect(divisionScope).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "분과" }), { target: { value: "창업" } });
    expect(divisionScope).toBeEnabled();
  });
});
