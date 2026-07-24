import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactRegistrationForm } from "./artifact-registration-form";
import { ReportRequirementForm } from "./report-requirement-forms";
import { ReportSubmissionForm } from "./report-submission-form";

const { refresh, registerArtifact, setRequirement, submitReport } = vi.hoisted(() => ({
  refresh: vi.fn(),
  registerArtifact: vi.fn(),
  setRequirement: vi.fn(),
  submitReport: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/teams/[teamId]/_actions/team-report-actions", () => ({
  decideReportAction: vi.fn(),
  registerArtifactAction: registerArtifact,
  removeReportRequirementAction: vi.fn(),
  setReportRequirementAction: setRequirement,
  submitReportVersionAction: submitReport,
}));

describe("보고서 요구사항 화면", () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    refresh.mockClear();
    registerArtifact.mockReset();
    setRequirement.mockReset();
    submitReport.mockReset();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  it("같은 화면에서 요구사항을 연속 저장해도 모달 종료와 성공 피드백을 반복한다", async () => {
    setRequirement.mockImplementation(async () => ({
      status: "success",
      message: "보고서 요구사항과 기한을 저장했습니다.",
    }));
    render(
      <ReportRequirementForm
        teamId="70000000-0000-4000-8000-000000000001"
        executionStartsAt={new Date("2026-08-01T00:00:00+09:00")}
        submissionEndsAt={new Date("2026-12-15T23:59:00+09:00")}
      />,
    );

    const openButton = screen.getByRole("button", { name: "보고서 요구사항 설정" });
    fireEvent.click(openButton);
    const dialog = screen.getByRole("dialog");
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    fireEvent.click(openButton);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    expect(setRequirement).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("보고서 요구사항과 기한을 저장했습니다.");
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

  it("보고서를 연속 제출해도 매번 모달 종료와 성공 피드백을 처리한다", async () => {
    submitReport.mockImplementation(async () => ({ status: "success", message: "보고서를 제출했습니다." }));
    const uploadedFile = new File(["report"], "report.pdf", { type: "application/pdf" });
    Object.defineProperty(uploadedFile, "arrayBuffer", { value: async () => new TextEncoder().encode("report").buffer });
    const BrowserFormData = FormData;
    vi.stubGlobal("FormData", class extends BrowserFormData {
      get(name: string) {
        return name === "file" ? uploadedFile : super.get(name);
      }
    });
    vi.stubGlobal("crypto", { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadId: "upload-1", uploadUrl: "https://upload.test/1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadId: "upload-2", uploadUrl: "https://upload.test/2" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 })));
    render(<ReportSubmissionForm teamId="70000000-0000-4000-8000-000000000001" requirements={[{ type: "FINAL", dueAt: new Date("2026-12-15T23:59:00+09:00") }]} />);
    const openButton = screen.getByRole("button", { name: "보고서 제출" });

    fireEvent.click(openButton);
    const dialog = screen.getByRole("dialog", { name: "새 버전 등록" });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    fireEvent.click(openButton);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    expect(submitReport).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("보고서를 제출했습니다.");
  });

  it("결과물 링크와 파일 등록을 한 모달 안에서 전환한다", () => {
    render(<ArtifactRegistrationForm teamId="70000000-0000-4000-8000-000000000001" />);

    expect(screen.queryByRole("dialog", { name: "결과물 등록" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "결과물 등록" }));
    expect(screen.getByRole("dialog", { name: "결과물 등록" })).toHaveAttribute("open");
    expect(screen.getByLabelText("외부 링크")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "파일 업로드" }));
    expect(screen.queryByLabelText("외부 링크")).not.toBeInTheDocument();
    expect(screen.getByLabelText("결과물 파일")).toBeInTheDocument();
  });

  it("결과물을 연속 등록해도 매번 모달 종료와 성공 피드백을 처리한다", async () => {
    registerArtifact.mockImplementation(async () => ({ status: "success", message: "결과물을 등록했습니다." }));
    render(<ArtifactRegistrationForm teamId="70000000-0000-4000-8000-000000000001" />);
    const openButton = screen.getByRole("button", { name: "결과물 등록" });

    fireEvent.click(openButton);
    const dialog = screen.getByRole("dialog", { name: "결과물 등록" });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    fireEvent.click(openButton);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    expect(registerArtifact).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("결과물을 등록했습니다.");
  });
});
