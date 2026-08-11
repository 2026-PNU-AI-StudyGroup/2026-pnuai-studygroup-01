import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtifactRegistrationForm } from "./artifact-registration-form";
import { ReportDecisionForm } from "./report-decision-form";
import { ReportFeedbackForm } from "./report-score-feedback-forms";
import { ReportSubmissionForm } from "./report-submission-form";

const { addFeedback, decideReport, refresh, registerArtifact, submitReport } = vi.hoisted(() => ({
  addFeedback: vi.fn(),
  decideReport: vi.fn(),
  refresh: vi.fn(),
  registerArtifact: vi.fn(),
  submitReport: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/teams/[teamId]/_actions/team-report-actions", () => ({
  addReportFeedbackAction: addFeedback,
  decideReportAction: decideReport,
  registerArtifactAction: registerArtifact,
  submitReportVersionAction: submitReport,
}));

function mockFile(bytes: Uint8Array, name = "report.pdf", type = "application/pdf") {
  const fileBytes = Uint8Array.from(bytes);
  const file = new File([fileBytes.buffer], name, { type });
  Object.defineProperty(file, "slice", {
    value: (start = 0, end = bytes.byteLength) => {
      const chunk = bytes.slice(start, end);
      return { arrayBuffer: async () => new Uint8Array(chunk).buffer };
    },
  });
  return file;
}

class SuccessfulUploadRequest {
  static instances: SuccessfulUploadRequest[] = [];
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
  status = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open = vi.fn();
  setRequestHeader = vi.fn();
  abort = vi.fn(() => this.onabort?.());

  constructor() {
    SuccessfulUploadRequest.instances.push(this);
  }

  send(file: File) {
    this.upload.onprogress?.({ loaded: file.size, total: file.size, lengthComputable: true } as ProgressEvent);
    this.status = 200;
    this.onload?.();
  }
}

function pendingResponseUntilAbort(signal: AbortSignal): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const rejectAbort = () => reject(new DOMException("aborted", "AbortError"));
    if (signal.aborted) {
      rejectAbort();
      return;
    }
    signal.addEventListener("abort", rejectAbort, { once: true });
  });
}

describe("보고서 요구사항 화면", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    decideReport.mockReset();
    addFeedback.mockReset();
    refresh.mockClear();
    registerArtifact.mockReset();
    submitReport.mockReset();
    SuccessfulUploadRequest.instances = [];
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  it("교수 검토에서 결정을 명시적으로 선택하고 학생에게 전달할 장문 의견을 작성한다", () => {
    render(
      <ReportDecisionForm
        teamId="70000000-0000-4000-8000-000000000001"
        reportVersionId="f4000000-0000-4000-8000-000000000001"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "보고서 검토" }));

    const comment = screen.getByRole("textbox", { name: "학생에게 전달할 검토 의견" });
    const approve = screen.getByRole("button", { name: "승인하기" });
    const requestRevision = screen.getByRole("button", { name: "수정 요청하기" });

    expect(comment.tagName).toBe("TEXTAREA");
    expect(comment).toHaveAttribute("maxlength", "2000");
    expect(requestRevision).toBeDisabled();
    expect(screen.queryByText("검토 완료")).not.toBeInTheDocument();

    fireEvent.change(comment, { target: { value: "표의 근거와 조사 일자를 보완해 주세요." } });

    expect(requestRevision).toBeEnabled();
    expect(screen.getByText("22 / 2000자")).toBeInTheDocument();

    fireEvent.click(approve);

    const dialog = screen.getByRole("dialog", { name: "보고서 승인 확인" });
    expect(dialog).toHaveAttribute("open");
    const confirm = screen.getByRole("button", { name: "승인 확정" });
    expect(confirm).toHaveAttribute("name", "decision");
    expect(confirm).toHaveAttribute("value", "APPROVED");
    expect(within(dialog).getByText("표의 근거와 조사 일자를 보완해 주세요.")).toBeInTheDocument();
  });

  it("피드백 입력은 행동을 선택한 뒤 대화상자에서 표시한다", () => {
    render(<ReportFeedbackForm teamId="team-1" reportId="report-1" />);

    expect(screen.queryByRole("textbox", { name: "피드백" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "피드백 남기기" }));
    expect(screen.getByRole("dialog", { name: "피드백 남기기" })).toHaveAttribute("open");
    expect(screen.getByRole("textbox", { name: "피드백" })).toBeInTheDocument();
  });

  it("학생 제출 선택지에는 설정된 보고서와 기한만 표시한다", () => {
    render(
      <ReportSubmissionForm
        teamId="70000000-0000-4000-8000-000000000001"
        requirements={[
          { id: "20000000-0000-4000-8000-000000000001", title: "설계 보고서", dueAt: new Date("2026-10-15T23:59:00+09:00") },
          { id: "20000000-0000-4000-8000-000000000002", title: "최종 보고서", dueAt: new Date("2026-12-15T23:59:00+09:00") },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "보고서 제출" }));
    const dialog = screen.getByRole("dialog");
    const reportType = screen.getByRole("combobox", { name: "보고서" });
    expect(dialog.querySelector('input[name="reportId"]')).toHaveValue("20000000-0000-4000-8000-000000000001");
    fireEvent.click(reportType);
    expect(screen.getByRole("option", { name: /설계 보고서/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /최종 보고서/ })).toBeInTheDocument();
  });

  it("보고서를 연속 제출해도 매번 모달 종료와 성공 피드백을 처리한다", async () => {
    submitReport.mockImplementation(async () => ({ status: "success", message: "보고서를 제출했습니다." }));
    const uploadedFile = mockFile(new TextEncoder().encode("report"));
    const BrowserFormData = FormData;
    vi.stubGlobal("FormData", class extends BrowserFormData {
      get(name: string) {
        return name === "file" ? uploadedFile : super.get(name);
      }
    });
    vi.stubGlobal("XMLHttpRequest", SuccessfulUploadRequest);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadId: "upload-1", uploadUrl: "https://upload.test/1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadId: "upload-2", uploadUrl: "https://upload.test/2" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 })));
    render(<ReportSubmissionForm teamId="70000000-0000-4000-8000-000000000001" requirements={[{ id: "20000000-0000-4000-8000-000000000002", title: "최종 보고서", dueAt: new Date("2026-12-15T23:59:00+09:00") }]} />);
    const openButton = screen.getByRole("button", { name: "보고서 제출" });

    fireEvent.click(openButton);
    const dialog = screen.getByRole("dialog", { name: "새 버전 제출" });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    fireEvent.click(openButton);
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));

    expect(submitReport).toHaveBeenCalledTimes(2);
    expect(SuccessfulUploadRequest.instances).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("보고서를 제출했습니다.");
  });

  it("파일 전송률을 보여주고 진행 중인 업로드를 취소한다", async () => {
    const uploadedFile = mockFile(new TextEncoder().encode("report"));
    const BrowserFormData = FormData;
    vi.stubGlobal("FormData", class extends BrowserFormData {
      get(name: string) {
        return name === "file" ? uploadedFile : super.get(name);
      }
    });
    class PendingUploadRequest extends SuccessfulUploadRequest {
      send(file: File) {
        this.upload.onprogress?.({ loaded: Math.ceil(file.size / 2), total: file.size, lengthComputable: true } as ProgressEvent);
      }
    }
    vi.stubGlobal("XMLHttpRequest", PendingUploadRequest);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ uploadId: "upload-1", uploadUrl: "https://upload.test/1" }), { status: 200 }),
    ));
    render(<ReportSubmissionForm teamId="70000000-0000-4000-8000-000000000001" requirements={[{ id: "20000000-0000-4000-8000-000000000002", title: "최종 보고서", dueAt: new Date("2026-12-15T23:59:00+09:00") }]} />);

    fireEvent.click(screen.getByRole("button", { name: "보고서 제출" }));
    const dialog = screen.getByRole("dialog", { name: "새 버전 제출" });
    fireEvent.submit(dialog.querySelector("form")!);

    expect(await screen.findByRole("progressbar", { name: "파일 업로드 중 50%" })).toHaveValue(50);
    fireEvent.click(screen.getByRole("button", { name: "업로드 취소" }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    expect(SuccessfulUploadRequest.instances[0].abort).toHaveBeenCalledTimes(1);
    expect(submitReport).not.toHaveBeenCalled();
  });

  it("업로드 재시도를 시작하면 이전 오류를 지우고 현재 진행 상태만 보여준다", async () => {
    const uploadedFile = mockFile(new TextEncoder().encode("report"));
    const BrowserFormData = FormData;
    vi.stubGlobal("FormData", class extends BrowserFormData {
      get(name: string) {
        return name === "file" ? uploadedFile : super.get(name);
      }
    });
    class PendingRetryUploadRequest extends SuccessfulUploadRequest {
      send(file: File) {
        this.upload.onprogress?.({ loaded: Math.ceil(file.size / 2), total: file.size, lengthComputable: true } as ProgressEvent);
      }
    }
    vi.stubGlobal("XMLHttpRequest", PendingRetryUploadRequest);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "이전 업로드 오류" }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadId: "upload-2", uploadUrl: "https://upload.test/2" }), { status: 200 })));
    render(<ReportSubmissionForm teamId="70000000-0000-4000-8000-000000000001" requirements={[{ id: "20000000-0000-4000-8000-000000000002", title: "최종 보고서", dueAt: new Date("2026-12-15T23:59:00+09:00") }]} />);

    fireEvent.click(screen.getByRole("button", { name: "보고서 제출" }));
    const dialog = screen.getByRole("dialog", { name: "새 버전 제출" });
    fireEvent.submit(dialog.querySelector("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("이전 업로드 오류");

    fireEvent.submit(dialog.querySelector("form")!);
    expect(await screen.findByRole("progressbar", { name: "파일 업로드 중 50%" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "업로드 취소" }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });

  it("presign 대기 중 페이지를 떠나면 요청을 중단하고 PUT과 보고서 등록을 시작하지 않는다", async () => {
    const uploadedFile = mockFile(new TextEncoder().encode("report"));
    const BrowserFormData = FormData;
    vi.stubGlobal("FormData", class extends BrowserFormData {
      get(name: string) {
        return name === "file" ? uploadedFile : super.get(name);
      }
    });
    vi.stubGlobal("XMLHttpRequest", SuccessfulUploadRequest);
    let presignSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      presignSignal = init?.signal as AbortSignal;
      return pendingResponseUntilAbort(presignSignal);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<ReportSubmissionForm teamId="70000000-0000-4000-8000-000000000001" requirements={[{ id: "20000000-0000-4000-8000-000000000002", title: "최종 보고서", dueAt: new Date("2026-12-15T23:59:00+09:00") }]} />);

    fireEvent.click(screen.getByRole("button", { name: "보고서 제출" }));
    fireEvent.submit(screen.getByRole("dialog", { name: "새 버전 제출" }).querySelector("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    unmount();
    await Promise.resolve();
    await Promise.resolve();

    expect(presignSignal?.aborted).toBe(true);
    expect(SuccessfulUploadRequest.instances).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(submitReport).not.toHaveBeenCalled();
  });

  it("PUT 전송 중 결과물 화면을 떠나면 XHR을 중단하고 complete와 등록을 실행하지 않는다", async () => {
    const uploadedFile = mockFile(new TextEncoder().encode("artifact"), "artifact.pdf");
    const BrowserFormData = FormData;
    vi.stubGlobal("FormData", class extends BrowserFormData {
      get(name: string) {
        return name === "file" ? uploadedFile : super.get(name);
      }
    });
    class PendingUnmountUploadRequest extends SuccessfulUploadRequest {
      send(file: File) {
        this.upload.onprogress?.({ loaded: 1, total: file.size, lengthComputable: true } as ProgressEvent);
      }
    }
    vi.stubGlobal("XMLHttpRequest", PendingUnmountUploadRequest);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ uploadId: "upload-1", uploadUrl: "https://upload.test/1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<ArtifactRegistrationForm teamId="70000000-0000-4000-8000-000000000001" />);

    fireEvent.click(screen.getByRole("button", { name: "결과물 등록" }));
    fireEvent.click(screen.getByRole("button", { name: "파일 업로드" }));
    fireEvent.submit(screen.getByRole("dialog", { name: "결과물 등록" }).querySelector("form")!);
    await waitFor(() => expect(SuccessfulUploadRequest.instances).toHaveLength(1));

    unmount();
    await Promise.resolve();
    await Promise.resolve();

    expect(SuccessfulUploadRequest.instances[0].abort).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(registerArtifact).not.toHaveBeenCalled();
  });

  it("complete 대기 중 페이지를 떠나면 완료 요청을 중단하고 보고서 등록 액션을 실행하지 않는다", async () => {
    const uploadedFile = mockFile(new TextEncoder().encode("report"));
    const BrowserFormData = FormData;
    vi.stubGlobal("FormData", class extends BrowserFormData {
      get(name: string) {
        return name === "file" ? uploadedFile : super.get(name);
      }
    });
    vi.stubGlobal("XMLHttpRequest", SuccessfulUploadRequest);
    let completeSignal: AbortSignal | undefined;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadId: "upload-1", uploadUrl: "https://upload.test/1" }), { status: 200 }))
      .mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) => {
        completeSignal = init?.signal as AbortSignal;
        return pendingResponseUntilAbort(completeSignal);
      });
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<ReportSubmissionForm teamId="70000000-0000-4000-8000-000000000001" requirements={[{ id: "20000000-0000-4000-8000-000000000002", title: "최종 보고서", dueAt: new Date("2026-12-15T23:59:00+09:00") }]} />);

    fireEvent.click(screen.getByRole("button", { name: "보고서 제출" }));
    fireEvent.submit(screen.getByRole("dialog", { name: "새 버전 제출" }).querySelector("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    unmount();
    await Promise.resolve();
    await Promise.resolve();

    expect(completeSignal?.aborted).toBe(true);
    expect(submitReport).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
