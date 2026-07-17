import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplyTopicForm } from "./apply-topic-form";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/topics/actions", () => ({ applyTopicAction: vi.fn() }));

describe("주제 지원 모달", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  it("목록 높이를 늘리지 않고 모달에서 지원서를 작성한다", () => {
    render(
      <ApplyTopicForm
        topicId="50000000-0000-4000-8000-000000000001"
        topicTitle="캠퍼스 이동약자를 위한 실내 길찾기"
        profile={null}
      />,
    );

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "지원하기" }));
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByText("캠퍼스 이동약자를 위한 실내 길찾기")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "지원서 닫기" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});
