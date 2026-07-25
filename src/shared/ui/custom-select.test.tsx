import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomMultiSelect, CustomSelect } from "@/shared/ui/custom-select";

describe("CustomSelect", () => {
  it("선택한 값을 폼 필드에 반영한다", () => {
    const { container } = render(
      <CustomSelect
        name="status"
        defaultValue="TODO"
        options={[
          { value: "TODO", label: "할 일" },
          { value: "DONE", label: "완료" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "할 일" }));
    fireEvent.click(screen.getByRole("option", { name: "완료" }));

    expect(container.querySelector<HTMLInputElement>('input[name="status"]')?.value).toBe("DONE");
    expect(screen.getByRole("button", { name: "완료" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("CustomMultiSelect", () => {
  it("여러 담당자를 추가하고 다시 해제한다", () => {
    const { container } = render(
      <CustomMultiSelect
        name="assigneeIds"
        options={[
          { value: "student-1", label: "정하늘" },
          { value: "student-2", label: "윤서준" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "담당자를 선택하세요" }));
    fireEvent.click(screen.getByRole("option", { name: "정하늘" }));
    fireEvent.click(screen.getByRole("option", { name: "윤서준" }));

    expect(
      [...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value),
    ).toEqual(["student-1", "student-2"]);

    fireEvent.click(screen.getByRole("option", { name: "정하늘" }));
    expect(
      [...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value),
    ).toEqual(["student-2"]);
  });
});
