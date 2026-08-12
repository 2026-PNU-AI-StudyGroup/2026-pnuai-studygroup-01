import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectAnnouncementList } from "@/app/teams/[teamId]/_components/project-announcement-list";
import type { AnnouncementRecord } from "@/modules/announcement/application/announcement-ports";

const announcement: AnnouncementRecord = {
  id: "announcement-1",
  authorId: "professor-1",
  authorName: "김교수",
  authorRole: "PROFESSOR",
  title: "중간 발표 안내",
  content: "발표 자료를 금요일까지 제출해 주세요.",
  category: "GENERAL",
  visibility: "TARGET_MEMBERS",
  pinned: true,
  teamId: "team-1",
  teamName: "테스트 팀",
  programId: null,
  programName: null,
  createdAt: new Date("2026-08-11T00:00:00.000Z"),
  updatedAt: new Date("2026-08-11T00:00:00.000Z"),
};

describe("프로젝트 공지 목록", () => {
  it("개요 미리보기에는 고정 우선 조회 결과 중 세 개만 표시한다", () => {
    const announcements = Array.from({ length: 4 }, (_, index) => ({
      ...announcement,
      id: `announcement-${index + 1}`,
      title: `프로젝트 공지 ${index + 1}`,
    }));

    render(<ProjectAnnouncementList announcements={announcements} preview />);

    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /프로젝트 공지 1/ })).toHaveAttribute("href", "/announcements/announcement-1");
    expect(screen.queryByText("프로젝트 공지 4")).not.toBeInTheDocument();
    expect(screen.getAllByText("고정")).toHaveLength(3);
    expect(screen.getAllByText("고정")[0]).toHaveClass("sr-only");
    expect(screen.getAllByText("프로젝트 공지")).toHaveLength(3);
  });

  it("전체 공지와 프로젝트 공지의 범위를 구분한다", () => {
    render(<ProjectAnnouncementList announcements={[
      announcement,
      { ...announcement, id: "announcement-global", title: "전체 일정 안내", teamId: null, teamName: null, visibility: "AUTHENTICATED" },
    ]} />);

    expect(screen.getByText("프로젝트 공지")).toBeInTheDocument();
    expect(screen.getByText("전체 공지")).toBeInTheDocument();
  });

  it("공지 없음 상태를 명확히 안내한다", () => {
    render(<ProjectAnnouncementList announcements={[]} />);

    expect(screen.getByText("등록된 공지가 없습니다")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 공지가 등록되면 여기에서 확인할 수 있습니다.")).toBeInTheDocument();
  });
});
