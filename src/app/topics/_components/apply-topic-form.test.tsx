import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplyTopicForm } from "./apply-topic-form";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/topics/_actions/topic-explorer-actions", () => ({ applyTopicAction: vi.fn() }));

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
        applicationMode="INDIVIDUAL_ONLY"
        applicationQuestions={[{ id: "question-1", label: "지원 동기", maxLength: 300, required: true }]}
        capacity={4}
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

  it("팀원 이메일을 검증해 칩으로 추가하고 개별 삭제한다", () => {
    const { container } = render(
      <ApplyTopicForm
        topicId="50000000-0000-4000-8000-000000000001"
        topicTitle="캠퍼스 이동약자를 위한 실내 길찾기"
        applicationMode="TEAM_ONLY"
        applicationQuestions={[]}
        capacity={3}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "지원하기" }));
    const input = screen.getByLabelText("함께 지원할 팀원");

    fireEvent.change(input, { target: { value: "outside@gmail.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("부산대학교 이메일");

    fireEvent.change(input, { target: { value: "member1@pusan.ac.kr" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("member1@pusan.ac.kr")).toBeInTheDocument();
    expect(container.querySelector<HTMLInputElement>('input[name="inviteeEmails"]')).toHaveValue("member1@pusan.ac.kr");

    fireEvent.click(screen.getByRole("button", { name: "member1@pusan.ac.kr 삭제" }));
    expect(screen.queryByText("member1@pusan.ac.kr")).not.toBeInTheDocument();
    expect(container.querySelector<HTMLInputElement>('input[name="inviteeEmails"]')).toHaveValue("");

    fireEvent.change(input, { target: { value: "member2@pusan.ac.kr" } });
    expect(container.querySelector<HTMLInputElement>('input[name="inviteeEmails"]')).toHaveValue("member2@pusan.ac.kr");
  });

  it("정원을 넘는 팀원 이메일은 추가하지 않는다", () => {
    render(
      <ApplyTopicForm
        topicId="50000000-0000-4000-8000-000000000001"
        topicTitle="캠퍼스 이동약자를 위한 실내 길찾기"
        applicationMode="TEAM_ONLY"
        applicationQuestions={[]}
        capacity={2}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "지원하기" }));
    const input = screen.getByLabelText("함께 지원할 팀원");
    fireEvent.paste(input, { clipboardData: { getData: () => "member1@pusan.ac.kr, member2@pusan.ac.kr" } });

    expect(screen.getByRole("alert")).toHaveTextContent("최대 1명");
    expect(screen.queryByText("member1@pusan.ac.kr")).not.toBeInTheDocument();
  });
});
