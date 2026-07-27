import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TopicApplicationEditor } from "@/app/topics/_components/topic-application-editor";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("@/app/topics/_actions/topic-explorer-actions", () => ({
  applyTopicAction: vi.fn(),
}));

describe("TopicApplicationEditor", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  it("팀 지원에서 팀장이 관리하는 정원 내 팀을 선택한다", () => {
    const { container } = render(
      <TopicApplicationEditor
        topicId="50000000-0000-4000-8000-000000000001"
        topicTitle="캠퍼스 이동약자를 위한 실내 길찾기"
        applicationMode="TEAM_ONLY"
        applicationQuestions={[]}
        capacity={4}
        leaderTeams={[
          { id: "70000000-0000-4000-8000-000000000001", name: "코드웨이브", memberCount: 3 },
          { id: "70000000-0000-4000-8000-000000000002", name: "정원 초과 팀", memberCount: 5 },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "이 프로젝트에 지원" }));
    expect(screen.getByRole("radio", { name: /개인 지원/ })).toBeDisabled();
    expect(screen.getByText("이 프로젝트는 팀 지원만 받습니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "지원서 작성하기" }));
    expect(screen.getByRole("button", { name: "선택한 팀으로 지원" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "팀을 선택하세요" }));

    expect(screen.getByRole("option", { name: /코드웨이브/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /정원 초과 팀/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: /코드웨이브/ }));
    expect(container.querySelector<HTMLInputElement>('input[name="studentTeamId"]')).toHaveValue(
      "70000000-0000-4000-8000-000000000001",
    );
    expect(screen.getByRole("button", { name: "선택한 팀으로 지원" })).toBeEnabled();
  });

  it("팀장이 관리하는 팀이 없으면 팀 생성 경로를 제공한다", () => {
    render(
      <TopicApplicationEditor
        topicId="50000000-0000-4000-8000-000000000001"
        topicTitle="캠퍼스 이동약자를 위한 실내 길찾기"
        applicationMode="TEAM_ONLY"
        applicationQuestions={[]}
        capacity={4}
        leaderTeams={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "이 프로젝트에 지원" }));
    fireEvent.click(screen.getByRole("button", { name: "지원서 작성하기" }));

    expect(screen.getByText("지원할 수 있는 내 팀이 없습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "팀 만들기" })).toHaveAttribute("href", "/teams?modal=create");
    expect(screen.getByRole("button", { name: "선택한 팀으로 지원" })).toBeDisabled();
  });

  it("개인·팀 지원이 모두 가능하면 방식을 선택한 뒤 지원서 화면으로 이동한다", () => {
    render(
      <TopicApplicationEditor
        topicId="50000000-0000-4000-8000-000000000001"
        topicTitle="캠퍼스 이동약자를 위한 실내 길찾기"
        applicationMode="INDIVIDUAL_OR_TEAM"
        applicationQuestions={[]}
        capacity={4}
        leaderTeams={[{ id: "70000000-0000-4000-8000-000000000001", name: "코드웨이브", memberCount: 3 }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "이 프로젝트에 지원" }));
    expect(screen.getByRole("heading", { name: "지원 방식 선택" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /팀 지원/ }));
    fireEvent.click(screen.getByRole("button", { name: "지원서 작성하기" }));

    expect(screen.getByRole("heading", { name: "지원서 작성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "팀을 선택하세요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지원 방식 다시 선택" })).toBeInTheDocument();
  });
});
