import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TagInput } from "@/shared/ui/tag-input";

describe("TagInput", () => {
  it("쉼표와 Enter 입력을 태그로 만들고 폼 계약을 유지한다", () => {
    const { container } = render(<TagInput name="skills" ariaLabel="보유 기술" defaultValue={["TypeScript"]} />);
    const input = screen.getByRole("textbox", { name: "보유 기술" });

    fireEvent.change(input, { target: { value: "Python," } });
    fireEvent.change(input, { target: { value: "Figma" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(container.querySelector<HTMLInputElement>('input[name="skills"]')).toHaveValue("TypeScript, Python, Figma");
    expect(screen.getByRole("button", { name: "Python 삭제" })).toBeInTheDocument();
  });

  it("중복을 제거하고 draft도 제출 값에 포함한다", () => {
    const { container } = render(<TagInput name="interests" ariaLabel="관심 분야" defaultValue={["웹"]} required />);
    const input = screen.getByRole("textbox", { name: "관심 분야" });

    fireEvent.change(input, { target: { value: "웹, 데이터" } });
    fireEvent.change(input, { target: { value: "접근성" } });

    expect(container.querySelector<HTMLInputElement>('input[name="interests"]')).toHaveValue("웹, 데이터, 접근성");
  });
});
