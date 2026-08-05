import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CancelProjectGuidanceRequestForm,
  ProjectGuidanceRequestForm,
  ProjectGuidanceResponseForm,
} from "@/app/teams/[teamId]/_components/project-guidance-request-forms";

const { cancelRequest, createRequest, respondRequest } = vi.hoisted(() => ({
  cancelRequest: vi.fn(),
  createRequest: vi.fn(),
  respondRequest: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_actions/project-guidance-request-actions", () => ({
  cancelProjectGuidanceRequestAction: cancelRequest,
  createProjectGuidanceRequestAction: createRequest,
  respondProjectGuidanceRequestAction: respondRequest,
}));

const teamId = "70000000-0000-4000-8000-000000000001";
const requestId = "a1000000-0000-4000-8000-000000000001";
const executionEndsAt = new Date("2026-12-15T23:59:00+09:00");

describe("프로젝트 지도 요청 폼", () => {
  beforeEach(() => {
    cancelRequest.mockReset();
    createRequest.mockReset();
    respondRequest.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("회의와 검토를 전환하며 요청 입력 제약과 프로젝트 기간을 적용한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T05:00:00Z"));

    const { container } = render(
      <ProjectGuidanceRequestForm teamId={teamId} executionEndsAt={executionEndsAt} />,
    );

    expect(container.querySelector('input[name="teamId"]')).toHaveValue(teamId);
    expect(screen.getByRole("radio", { name: /회의 요청/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /검토 요청/ })).not.toBeChecked();

    expect(screen.getByLabelText("제목")).toHaveAttribute("minlength", "2");
    expect(screen.getByLabelText("제목")).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText("제목")).toBeRequired();
    expect(screen.getByLabelText("요청 내용")).toHaveAttribute("minlength", "5");
    expect(screen.getByLabelText("요청 내용")).toHaveAttribute("maxlength", "2000");
    expect(screen.getByLabelText("요청 내용")).toBeRequired();
    expect(screen.getByLabelText("참고 링크 (선택)")).toHaveAttribute("type", "url");
    expect(screen.getByLabelText("참고 링크 (선택)")).not.toBeRequired();

    const preferredAt = screen.getByLabelText("희망 일시");
    expect(preferredAt).toBeRequired();
    expect(preferredAt).toHaveAttribute("min", "2026-08-03T14:00");
    expect(preferredAt).toHaveAttribute("max", "2026-12-15T23:59");

    fireEvent.click(screen.getByRole("radio", { name: /검토 요청/ }));

    expect(screen.queryByLabelText("희망 일시")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /검토 요청/ })).toBeChecked();
  });

  it("요청 액션에 숨김 필드와 입력을 전달하고 성공 후 폼을 초기화한다", async () => {
    createRequest.mockResolvedValue({ status: "success", message: "요청을 보냈습니다." });
    const { container } = render(
      <ProjectGuidanceRequestForm teamId={teamId} executionEndsAt={executionEndsAt} />,
    );

    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "중간 점검 회의" } });
    fireEvent.change(screen.getByLabelText("요청 내용"), { target: { value: "구현 현황을 함께 점검하고 싶습니다." } });
    fireEvent.change(screen.getByLabelText("참고 링크 (선택)"), { target: { value: "https://example.com/progress" } });
    fireEvent.change(screen.getByLabelText("희망 일시"), { target: { value: "2026-08-10T14:00" } });
    fireEvent.submit(screen.getByLabelText("제목").closest("form")!);

    await waitFor(() => expect(createRequest).toHaveBeenCalledTimes(1));
    const formData = createRequest.mock.calls[0][1] as FormData;
    expect(formData.get("teamId")).toBe(teamId);
    expect(formData.get("kind")).toBe("MEETING");
    expect(formData.get("title")).toBe("중간 점검 회의");
    expect(formData.get("preferredAt")).toBe("2026-08-10T14:00");
    expect(await screen.findByRole("status")).toHaveTextContent("요청을 보냈습니다.");
    expect(container.querySelector('input[name="referenceUrl"]')).toHaveValue("");
    expect(screen.getByLabelText("제목")).toHaveValue("");
    expect(screen.getByLabelText("요청 내용")).toHaveValue("");
    expect(screen.getByRole("radio", { name: /회의 요청/ })).toBeChecked();
  });

  it("회의 답변에만 확정 일시를 제공하고 오류 피드백과 액션 필드를 전달한다", async () => {
    respondRequest.mockResolvedValue({ status: "error", message: "답변 내용을 확인해 주세요." });
    const { container, rerender } = render(
      <ProjectGuidanceResponseForm teamId={teamId} requestId={requestId} kind="MEETING" />,
    );

    expect(screen.getByLabelText("답변")).toHaveAttribute("minlength", "2");
    expect(screen.getByLabelText("답변")).toHaveAttribute("maxlength", "2000");
    expect(screen.getByLabelText("답변")).toBeRequired();
    expect(screen.getByLabelText("확정 일시 (선택)")).toHaveAttribute("name", "scheduledAt");
    expect(screen.getByLabelText("확정 일시 (선택)")).not.toBeRequired();

    rerender(<ProjectGuidanceResponseForm teamId={teamId} requestId={requestId} kind="REVIEW" />);
    expect(screen.queryByLabelText("확정 일시 (선택)")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("답변"), { target: { value: "확인했습니다." } });
    fireEvent.submit(screen.getByLabelText("답변").closest("form")!);

    await waitFor(() => expect(respondRequest).toHaveBeenCalledTimes(1));
    const formData = respondRequest.mock.calls[0][1] as FormData;
    expect(formData.get("teamId")).toBe(teamId);
    expect(formData.get("requestId")).toBe(requestId);
    expect(formData.get("response")).toBe("확인했습니다.");
    expect(await screen.findByRole("alert")).toHaveTextContent("답변 내용을 확인해 주세요.");
    expect(container.querySelector('input[name="scheduledAt"]')).not.toBeInTheDocument();
  });

  it("확인한 취소만 액션에 전달하고 성공 상태를 알린다", async () => {
    cancelRequest.mockResolvedValue({ status: "success", message: "요청을 취소했습니다." });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CancelProjectGuidanceRequestForm teamId={teamId} requestId={requestId} />);

    const cancelButton = screen.getByRole("button", { name: "요청 취소" });
    expect(cancelButton).toHaveClass("min-h-11");
    fireEvent.click(cancelButton);
    expect(cancelRequest).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(cancelButton);

    await waitFor(() => expect(cancelRequest).toHaveBeenCalledTimes(1));
    const formData = cancelRequest.mock.calls[0][1] as FormData;
    expect(formData.get("teamId")).toBe(teamId);
    expect(formData.get("requestId")).toBe(requestId);
    expect(await screen.findByRole("status")).toHaveTextContent("요청을 취소했습니다.");
  });
});
