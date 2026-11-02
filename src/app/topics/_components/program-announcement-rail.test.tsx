import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/announcements/_actions/announcement-actions", () => ({
  deleteAnnouncementAction: vi.fn(),
}));

import { ProgramAnnouncementRail } from "@/app/topics/_components/program-announcement-rail";
import type { AnnouncementRecord } from "@/modules/announcement/application/announcement-ports";

const base: AnnouncementRecord = {
  id: "notice-1",
  authorId: "professor-1",
  authorName: "김교수",
  authorRole: "PROFESSOR",
  title: "발표 일정 안내",
  content: "발표 순서와 시간을 확인해 주세요.",
  visibility: "AUTHENTICATED",
  pinned: false,
  popup: false,
  teamId: null,
  teamName: null,
  projectId: null,
  programId: "program-1",
  programName: "졸업과제",
  createdAt: new Date("2026-08-11T00:00:00.000Z"),
  updatedAt: new Date("2026-08-11T00:00:00.000Z"),
  attachments: [],
};

describe("프로그램 공지 카드 레일", () => {
  it("공지를 한 줄씩 늘어놓고 누르면 본문을 대화상자로 연다", () => {
    render(<ProgramAnnouncementRail announcements={[
      base,
      { ...base, id: "notice-2", title: "제출 안내", visibility: "TARGET_MEMBERS" },
    ]} />);

    expect(screen.getByRole("region", { name: "프로그램 공지" })).toHaveTextContent("2건");
    const firstItem = screen.getByRole("button", { name: /발표 일정 안내/ });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // 전체 공개가 기본이라 목록에는 구성원 전용만 적는다.
    expect(screen.getByRole("button", { name: /제출 안내/ })).toHaveTextContent("구성원 전용");
    expect(firstItem).not.toHaveTextContent("전체 공개");

    fireEvent.click(firstItem);
    const dialog = screen.getByRole("dialog", { name: "발표 일정 안내" });
    expect(dialog).toHaveClass("max-w-3xl", "sm:max-h-[min(42rem,calc(100dvh-4rem))]");
    expect(dialog.querySelector("header")).toHaveClass("sticky", "top-0");
    expect(dialog).toHaveTextContent("발표 순서와 시간을 확인해 주세요.");
    expect(dialog).toHaveTextContent("김교수");
    expect(dialog).toHaveTextContent("전체 공개");
    fireEvent.click(screen.getByRole("button", { name: "공지 닫기" }));
    expect(dialog).not.toHaveAttribute("open");
  });

  it("다섯 건이 넘으면 나머지를 접어 두고 펼쳐 본다", () => {
    render(<ProgramAnnouncementRail announcements={Array.from({ length: 7 }, (_, index) => ({ ...base, id: `notice-${index}`, title: `공지 ${index + 1}` }))} />);

    const more = screen.getByText("공지 2건 더 보기");
    expect(more.closest("details")).not.toHaveAttribute("open");
    expect(more.closest("details")).toContainElement(screen.getByRole("button", { name: /공지 7/ }));
  });

  it("관리 권한이 있는 공지에는 수정과 삭제를 함께 보여준다", () => {
    // 예전에는 프로그램 공지에 수정만 있어 삭제 기능이 없는 것처럼 보였다.
    render(
      <ProgramAnnouncementRail
        announcements={[base]}
        manageableAnnouncementIds={[base.id]}
        deleteControls={{ [base.id]: <button type="button">공지 삭제</button> }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /발표 일정 안내/ }));
    const manageGroup = screen.getByRole("group", { name: "공지 관리" });
    expect(manageGroup).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "공지 수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공지 삭제" })).toBeInTheDocument();
  });

  it("공지가 없어도 빈 프로그램 공지 영역을 렌더링한다", () => {
    render(<ProgramAnnouncementRail announcements={[]} />);

    expect(screen.getByRole("region", { name: "프로그램 공지" })).toBeInTheDocument();
    expect(screen.getByText("등록된 공지가 없습니다")).toBeInTheDocument();
    expect(screen.queryByText(/총\s*0건/)).not.toBeInTheDocument();
  });

  it("작성 권한이 전달되면 프로그램 공지 제목 옆에 신규 작성 링크를 표시한다", () => {
    render(
      <ProgramAnnouncementRail
        announcements={[]}
        createHref="/announcements/new?target=program:program-1"
      />,
    );

    expect(screen.getByRole("link", { name: "새 공지 작성" })).toHaveAttribute(
      "href",
      "/announcements/new?target=program:program-1",
    );
  });

  it("관리 가능한 공지 모달에 수정 액션과 복귀 경로를 표시한다", () => {
    render(
      <ProgramAnnouncementRail
        announcements={[base]}
        manageableAnnouncementIds={[base.id]}
        returnHref="/topics?programId=program-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /발표 일정 안내/ }));

    expect(screen.getByRole("link", { name: "공지 수정" })).toHaveAttribute(
      "href",
      "/announcements/notice-1/edit?returnTo=%2Ftopics%3FprogramId%3Dprogram-1",
    );
    expect(screen.queryByRole("button", { name: "공지 삭제" })).not.toBeInTheDocument();
  });
});
