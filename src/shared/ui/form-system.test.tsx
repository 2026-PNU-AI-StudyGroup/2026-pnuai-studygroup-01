import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DateTimeInput, FileInput, FormField, Textarea, TextInput, Toggle } from "@/shared/ui/form-system";

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

  it("토글은 체크 상태와 FormData 이름을 유지한다", () => {
    const { container } = render(
      <form>
        <Toggle name="studentProjectCreationEnabled" value="true" defaultChecked label="학생 프로젝트 제안 허용" />
      </form>,
    );
    const toggle = screen.getByRole("checkbox", { name: "학생 프로젝트 제안 허용" });

    expect(new FormData(container.querySelector("form")!).get("studentProjectCreationEnabled")).toBe("true");
    fireEvent.click(toggle);
    expect(new FormData(container.querySelector("form")!).has("studentProjectCreationEnabled")).toBe(false);
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
    expect(screen.getByRole("dialog", { name: "일정" })).toBeVisible();
    expect(screen.getByRole("gridcell", { name: "2026년 8월 6일" })).toBeDisabled();
    fireEvent.click(screen.getByRole("gridcell", { name: "2026년 8월 8일" }));

    expect(new FormData(container.querySelector("form")!).get("scheduledAt")).toBe("2026-08-08");
  });

  it("일시 선택에서 선택한 날짜와 시간을 같은 서버 값으로 제출한다", () => {
    const { container } = render(
      <form>
        <DateTimeInput aria-label="회의 일시" name="meetingAt" defaultValue="2026-08-07T13:20" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "회의 일시" }));
    expect(screen.getByLabelText("시간")).toHaveValue("13:20");
    fireEvent.change(screen.getByLabelText("시간"), { target: { value: "15:45" } });
    fireEvent.click(screen.getByRole("gridcell", { name: "2026년 8월 8일" }));

    expect(new FormData(container.querySelector("form")!).get("meetingAt")).toBe("2026-08-08T15:45");
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
