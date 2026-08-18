import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChoiceCard, DateTimeInput, FileInput, FormField, FormSection, NumberField, Textarea, TextInput, Toggle } from "@/shared/ui/form-system";

describe("form-system controls", () => {
  it("공통 텍스트·날짜·파일 호스트가 서버 제출 계약을 유지한다", () => {
    const { container } = render(
      <form>
        <FormField id="title" label="제목" required error="제목을 입력해 주세요.">
          <TextInput id="title" name="title" defaultValue="PMS" />
        </FormField>
        <Textarea aria-label="설명" name="description" defaultValue="설명" />
        <DateTimeInput aria-label="마감일" name="dueAt" type="date" defaultValue="2026-08-07" />
        <FileInput aria-label="첨부 파일" name="file" accept=".pdf" />
      </form>,
    );

    expect(screen.getByLabelText(/제목/)).toHaveClass("form-control");
    expect(screen.getByRole("button", { name: "마감일" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getByLabelText("첨부 파일")).toHaveAttribute("type", "file");
    expect(screen.getByRole("alert")).toHaveTextContent("제목을 입력해 주세요.");
    const formData = new FormData(container.querySelector("form")!);
    expect(formData.get("title")).toBe("PMS");
    expect(formData.get("description")).toBe("설명");
    expect(formData.get("dueAt")).toBe("2026-08-07");
  });

  it("필수 일시 선택은 프록시 입력을 통해 네이티브 검증에 참여한다", () => {
    const { container } = render(<DateTimeInput aria-label="마감일" name="dueAt" required />);
    const proxy = container.querySelector<HTMLInputElement>("[data-validation-proxy='date-time-input']")!;

    expect(proxy).not.toHaveAttribute("readonly");
    expect(proxy.willValidate).toBe(true);
    expect(proxy.checkValidity()).toBe(false);
  });

  it("제어형 값과 onValueChange만 사용해도 읽기 전용 필드 경고를 내지 않는다", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      render(<DateTimeInput aria-label="마감일" value="2026-08-07T13:20" onValueChange={vi.fn()} />);

      expect(consoleError.mock.calls.flat().join(" ")).not.toContain("without an `onChange` handler");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("토글은 체크 상태와 FormData 이름을 유지한다", () => {
    const { container } = render(
      <form>
        <Toggle name="studentProjectCreationEnabled" value="true" defaultChecked label="학생 프로젝트 등록 허용" />
      </form>,
    );
    const toggle = screen.getByRole("checkbox", { name: "학생 프로젝트 등록 허용" });

    expect(new FormData(container.querySelector("form")!).get("studentProjectCreationEnabled")).toBe("true");
    fireEvent.click(toggle);
    expect(new FormData(container.querySelector("form")!).has("studentProjectCreationEnabled")).toBe(false);
  });

  it("숫자 필드는 필수 검증을 위해 입력 중 빈 값을 보존한다", () => {
    const onValueChange = vi.fn();
    render(<NumberField aria-label="투표 수" value={3} min={1} onValueChange={onValueChange} required />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "투표 수" }), { target: { value: "" } });

    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("섹션과 선택 컨트롤의 화면 밀도를 명시적인 API로 정한다", () => {
    render(
      <FormSection title="운영 설정" appearance="embedded" density="compact" actions={<button type="button">득표현황</button>}>
        <ChoiceCard density="compact" name="advisorEnabled" value="true" label="지도교수 있음" />
      </FormSection>,
    );

    const section = screen.getByRole("heading", { name: "운영 설정" }).closest("section");
    expect(section).toHaveAttribute("data-form-section-appearance", "embedded");
    expect(section).toHaveAttribute("data-form-section-density", "compact");
    expect(screen.getByRole("heading", { name: "운영 설정" }).closest("header")).toContainElement(screen.getByRole("button", { name: "득표현황" }));
    expect(screen.getByRole("radio", { name: "지도교수 있음" })).toBeInTheDocument();
  });

  it("날짜를 자체 달력에서 선택하고 min·max 범위를 지킨다", () => {
    const { container } = render(
      <form>
        <DateTimeInput
          aria-label="일정"
          name="scheduledAt"
          type="date"
          defaultValue="2026-08-07"
          min="2026-08-07"
          max="2026-08-08"
        />
      </form>,
    );

    expect(container.querySelector('input[type="date"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "일정" }));
    const calendar = screen.getByRole("dialog", { name: "일정" });
    expect(calendar).toBeVisible();
    expect(calendar).toHaveStyle({ width: "320px" });
    expect(screen.queryByRole("button", { name: "오늘" })).toBeNull();
    expect(screen.getByRole("gridcell", { name: "2026년 8월 6일" })).toBeDisabled();
    fireEvent.click(screen.getByRole("gridcell", { name: "2026년 8월 8일" }));

    expect(new FormData(container.querySelector("form")!).get("scheduledAt")).toBe("2026-08-08");
    expect(screen.queryByRole("dialog", { name: "일정" })).toBeNull();
  });

  it("일시 선택에서 선택한 날짜와 시간을 같은 서버 값으로 제출한다", () => {
    const { container } = render(
      <form>
        <DateTimeInput aria-label="회의 일시" name="meetingAt" defaultValue="2026-08-07T13:20" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "회의 일시" }));
    expect(screen.getByRole("dialog", { name: "회의 일시" })).toHaveStyle({ width: "328px" });
    expect(screen.getByLabelText("시간")).toHaveValue("13:20");
    fireEvent.change(screen.getByLabelText("시간"), { target: { value: "15:45" } });
    fireEvent.click(screen.getByRole("gridcell", { name: "2026년 8월 8일" }));

    expect(new FormData(container.querySelector("form")!).get("meetingAt")).toBe("2026-08-08T15:45");
  });

  it("날짜를 유지하고 시간만 바꿀 때 확인 버튼으로 반영한다", () => {
    const { container } = render(
      <form>
        <DateTimeInput aria-label="회의 일시" name="meetingAt" defaultValue="2026-08-07T13:20" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "회의 일시" }));
    fireEvent.change(screen.getByLabelText("시간"), { target: { value: "15:45" } });
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(new FormData(container.querySelector("form")!).get("meetingAt")).toBe("2026-08-07T15:45");
  });

  it("일시 선택을 취소하면 기존 서버 값을 유지한다", () => {
    const { container } = render(
      <form>
        <DateTimeInput aria-label="회의 일시" name="meetingAt" defaultValue="2026-08-07T13:20" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "회의 일시" }));
    fireEvent.change(screen.getByLabelText("시간"), { target: { value: "15:45" } });
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(new FormData(container.querySelector("form")!).get("meetingAt")).toBe("2026-08-07T13:20");
  });

  it("controlled 일시 값이 바뀌면 다음 달력 열기와 서버 값에 반영한다", () => {
    const { container, rerender } = render(
      <form>
        <DateTimeInput aria-label="회의 일시" name="meetingAt" value="2026-08-07T13:20" />
      </form>,
    );

    rerender(
      <form>
        <DateTimeInput aria-label="회의 일시" name="meetingAt" value="2026-08-09T17:40" />
      </form>,
    );

    expect(new FormData(container.querySelector("form")!).get("meetingAt")).toBe("2026-08-09T17:40");
    fireEvent.click(screen.getByRole("button", { name: "회의 일시" }));
    expect(screen.getByLabelText("시간")).toHaveValue("17:40");
  });
});
