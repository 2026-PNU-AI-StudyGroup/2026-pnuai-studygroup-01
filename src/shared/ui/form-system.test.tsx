import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DateTimeInput, FileInput, FormField, Textarea, TextInput, Toggle } from "@/shared/ui/form-system";

describe("form-system controls", () => {
  it("공통 텍스트·날짜·파일 호스트가 각각의 네이티브 계약과 제어 클래스를 유지한다", () => {
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
    expect(screen.getByLabelText("마감일")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("마감일")).toHaveClass("form-control--datetime");
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
});
