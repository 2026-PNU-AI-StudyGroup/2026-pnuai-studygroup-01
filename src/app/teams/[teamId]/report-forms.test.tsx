import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportRequirementForm, ReportSubmissionForm } from "./report-forms";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/teams/[teamId]/report-actions", () => ({
  decideReportAction: vi.fn(),
  registerArtifactAction: vi.fn(),
  removeReportRequirementAction: vi.fn(),
  setReportRequirementAction: vi.fn(),
  submitReportVersionAction: vi.fn(),
}));

describe("보고서 요구사항 화면", () => {
  beforeEach(() => {
    refresh.mockClear();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  it("교수와 관리자가 프로젝트 일정 안에서 제출 보고서와 기한을 설정한다", () => {
    render(
      <ReportRequirementForm
        teamId="70000000-0000-4000-8000-000000000001"
        executionStartsAt={new Date("2026-08-01T00:00:00+09:00")}
        submissionEndsAt={new Date("2026-12-15T23:59:00+09:00")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "보고서 요구사항 설정" }));
    expect(screen.getByRole("combobox", { name: "제출 보고서" })).toHaveValue("START");
    expect(screen.getByLabelText("제출 기한")).toHaveAttribute("min", "2026-08-01T00:00");
    expect(screen.getByLabelText("제출 기한")).toHaveAttribute("max", "2026-12-15T23:59");
  });

  it("학생 제출 선택지에는 설정된 보고서와 기한만 표시한다", () => {
    render(
      <ReportSubmissionForm
        teamId="70000000-0000-4000-8000-000000000001"
        requirements={[
          { type: "MIDTERM", dueAt: new Date("2026-10-15T23:59:00+09:00") },
          { type: "FINAL", dueAt: new Date("2026-12-15T23:59:00+09:00") },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "보고서 제출" }));
    const reportType = screen.getByRole("combobox", { name: "보고서 종류" });
    expect(reportType).toHaveValue("MIDTERM");
    expect(screen.queryByRole("option", { name: /착수 보고서/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /중간 보고서/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /결과 보고서/ })).toBeInTheDocument();
  });
});
