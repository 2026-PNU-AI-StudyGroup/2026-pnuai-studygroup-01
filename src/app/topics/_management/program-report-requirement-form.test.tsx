import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramReportRequirementForm } from "@/app/topics/_management/program-report-requirement-form";

describe("ProgramReportRequirementForm", () => {
  it("제출 이력이 있는 보고서는 삭제를 비활성화하고 제목·제출 구분 수정은 허용한다", () => {
    render(<ProgramReportRequirementForm programId="40000000-0000-4000-8000-000000000001" definitions={[{
      id: "40000000-0000-4000-8000-000000000002",
      title: "중간 보고서",
      dueAt: new Date("2026-08-20T09:00:00Z"),
      required: false,
      versionCount: 1,
    }]} />);

    expect(screen.getByText(/선택 제출/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "중간 보고서 삭제" })).toBeDisabled();
    expect(screen.getByRole("tooltip")).toHaveTextContent("제출 이력이 1개 이상 있어 삭제할 수 없습니다.");

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    const dialog = screen.getByRole("dialog", { name: "보고서 수정" });
    expect(within(dialog).getByRole("textbox", { name: "보고서 제목" })).not.toHaveAttribute("readonly");
    expect(within(dialog).getByRole("combobox", { name: "제출 구분" })).toHaveTextContent("선택 제출");
  });
});
