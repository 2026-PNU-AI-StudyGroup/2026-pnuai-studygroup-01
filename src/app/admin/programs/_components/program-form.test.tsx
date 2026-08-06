import { render, screen } from "@testing-library/react";
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
    expect(screen.getByLabelText("운영 시작")).toBeRequired();
    expect(screen.getByLabelText("운영 종료")).toBeRequired();
    expect(screen.getByRole("button", { name: "초안 등록" })).toBeEnabled();
  });
});
