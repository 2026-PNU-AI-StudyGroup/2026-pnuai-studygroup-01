import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

describe("ConfirmSubmitButton", () => {
  it("확인한 뒤에만 원래 submitter로 폼을 제출한다", () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ConfirmSubmitButton confirmMessage="정말 삭제하시겠습니까?">삭제</ConfirmSubmitButton>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("정말 삭제하시겠습니까?");

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("기본 제약 조건을 먼저 표시하고 확인 대화상자를 열지 않는다", () => {
    render(
      <form>
        <input required aria-label="이름" />
        <ConfirmSubmitButton confirmMessage="저장하시겠습니까?">저장</ConfirmSubmitButton>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
