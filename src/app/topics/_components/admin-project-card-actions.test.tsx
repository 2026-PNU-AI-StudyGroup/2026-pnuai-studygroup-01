import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AdminProjectCardActions } from "@/app/topics/_components/admin-project-card-actions";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";

const data: AdminProjectCardData = {
  topicId: "topic-1",
  team: {
    id: "team-1",
    name: "알파팀",
    members: [
      {
        id: "student-1",
        name: "김학생",
        role: "LEADER",
        email: "school@example.com",
        contactEmail: "student@example.com",
        phone: "010-1234-5678",
        kakao: "student-kakao",
        github: "https://github.com/student",
        instagram: null,
      },
    ],
  },
  reportProgress: { requiredCount: 2, submittedCount: 1, overdueCount: 0 },
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("관리자 프로젝트 카드 동작", () => {
  it("진행 현황으로 이동하고 팀원의 모든 연락처를 모달에서 보여준다", () => {
    render(<AdminProjectCardActions projectTitle="실내 길찾기" data={data} />);

    expect(screen.getByRole("link", { name: "진행 현황" })).toHaveAttribute("href", "/projects/topic-1");
    const trigger = screen.getByRole("button", { name: "연락처 정보" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "팀 연락처" });
    expect(dialog).toHaveTextContent("알파팀 · 팀원 1명");
    expect(dialog).toHaveTextContent("김학생팀장");
    expect(dialog).toHaveTextContent("school@example.com");
    expect(dialog).toHaveTextContent("student@example.com");
    expect(dialog).toHaveTextContent("010-1234-5678");
    expect(dialog).toHaveTextContent("student-kakao");
    expect(within(dialog).getByRole("link", { name: /GitHubgithub.com\/student/ })).toHaveAttribute(
      "href",
      "https://github.com/student",
    );
    expect(dialog).not.toHaveTextContent("Instagram");

    fireEvent.click(within(dialog).getByRole("button", { name: "연락처 정보 닫기" }));
    expect(screen.queryByRole("dialog", { name: "팀 연락처" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("팀이 없으면 같은 두 버튼을 비활성 상태로 유지한다", () => {
    render(<AdminProjectCardActions projectTitle="실내 길찾기" />);

    expect(screen.getByRole("button", { name: "진행 현황" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "연락처 정보" })).toHaveAttribute("aria-disabled", "true");
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips).toHaveLength(2);
    expect(tooltips.every((tooltip) => tooltip.textContent === "팀 구성 후 확인할 수 있습니다.")).toBe(true);
    expect(screen.getByRole("button", { name: "진행 현황" })).toHaveAttribute(
      "aria-describedby",
      tooltips[0].id,
    );
  });
});
