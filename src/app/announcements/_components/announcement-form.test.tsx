import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/announcements/_actions/announcement-actions", () => ({
  createAnnouncementAction: vi.fn(),
  updateAnnouncementAction: vi.fn(),
}));

import { AnnouncementForm } from "@/app/announcements/_components/announcement-form";

const targets = {
  programs: [{ id: "program-1", name: "졸업과제" }],
  teams: [{ id: "team-1", name: "팀 하나", programId: "program-1", projectId: "project-1" }],
};

describe("공지 작성 열람 범위", () => {
  it("시스템 공지 대상은 고정되어 프로그램·프로젝트를 선택할 수 없다", () => {
    const { container } = render(
      <AnnouncementForm
        targets={targets}
        targetLocked
        targetLabel="시스템 전체"
      />,
    );

    expect(screen.getByText("시스템 전체")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "공지 대상" })).not.toBeInTheDocument();
    expect(container.querySelector('input[name="target"]')).toHaveValue("GLOBAL");
  });

  it("프로그램 공지는 로그인 사용자 전체를 기본 선택한다", () => {
    render(<AnnouncementForm targets={targets} initialTarget="program:program-1" />);

    expect(screen.getByRole("group", { name: "열람 범위" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /로그인 사용자 전체/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /프로그램 구성원만/ })).not.toBeChecked();
  });

  it("수정 시 저장된 구성원 전용 선택을 복원한다", () => {
    render(
      <AnnouncementForm
        announcementId="notice-1"
        targets={targets}
        initialTarget="program:program-1"
        initialVisibility="TARGET_MEMBERS"
      />,
    );

    expect(screen.getByRole("radio", { name: /프로그램 구성원만/ })).toBeChecked();
  });

  it("팀 공지는 열람 범위 선택을 숨기고 구성원 전용 값을 제출한다", () => {
    const { container } = render(<AnnouncementForm targets={targets} initialTarget="team:team-1" initialVisibility="TARGET_MEMBERS" />);

    expect(screen.queryByRole("group", { name: "열람 범위" })).not.toBeInTheDocument();
    expect(container.querySelector('input[name="visibility"]')).toHaveValue("TARGET_MEMBERS");
  });

  it("프로그램에서 팀 대상으로 바꾸면 구성원 전용으로 정규화한다", () => {
    const { container } = render(<AnnouncementForm targets={targets} initialTarget="program:program-1" />);

    fireEvent.click(screen.getByRole("radio", { name: /프로그램 구성원만/ }));
    fireEvent.click(screen.getByRole("radio", { name: "팀 하나" }));

    expect(screen.queryByRole("group", { name: "열람 범위" })).not.toBeInTheDocument();
    expect(container.querySelector('input[name="target"]')).toHaveValue("team:team-1");
    expect(container.querySelector('input[name="visibility"]')).toHaveValue("TARGET_MEMBERS");
  });
});
