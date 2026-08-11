import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgramAnnouncementRail } from "@/app/topics/_components/program-announcement-rail";
import type { AnnouncementRecord } from "@/modules/announcement/application/announcement-ports";

const base: AnnouncementRecord = {
  id: "notice-1",
  authorId: "professor-1",
  authorName: "김교수",
  authorRole: "PROFESSOR",
  title: "발표 일정 안내",
  content: "발표 순서와 시간을 확인해 주세요.",
  category: "GENERAL",
  visibility: "AUTHENTICATED",
  pinned: false,
  teamId: null,
  teamName: null,
  programId: "program-1",
  programName: "졸업과제",
  createdAt: new Date("2026-08-11T00:00:00.000Z"),
  updatedAt: new Date("2026-08-11T00:00:00.000Z"),
};

describe("프로그램 공지 카드 레일", () => {
  it("전달받은 공지를 순서대로 모두 모달 실행 카드로 렌더링한다", () => {
    render(<ProgramAnnouncementRail announcements={[
      base,
      { ...base, id: "notice-2", title: "제출 안내", visibility: "TARGET_MEMBERS" },
    ]} />);

    expect(screen.getByRole("region", { name: "프로그램 공지" })).toBeInTheDocument();
    const firstCard = screen.getByRole("button", { name: /발표 일정 안내/ });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("전체 공개")).toBeInTheDocument();
    expect(screen.getByText("구성원 전용")).toBeInTheDocument();
    const previous = screen.getByRole("button", { name: "이전 프로그램 공지" });
    const next = screen.getByRole("button", { name: "다음 프로그램 공지" });
    expect(previous).toBeDisabled();
    expect(previous).toHaveClass("left-0");
    expect(next).toHaveClass("right-0");
    expect(screen.getByRole("list")).toHaveClass("[scrollbar-width:none]");
    expect(screen.getByRole("list")).not.toHaveClass("snap-x");

    fireEvent.click(firstCard);
    const dialog = screen.getByRole("dialog", { name: "발표 일정 안내" });
    expect(dialog).toHaveTextContent("발표 순서와 시간을 확인해 주세요.");
    expect(dialog).toHaveTextContent("김교수");
    fireEvent.click(screen.getByRole("button", { name: "공지 닫기" }));
    expect(dialog).not.toHaveAttribute("open");
  });

  it("중간 위치에서 화살표를 누르면 다음 카드 시작점에 맞춘다", () => {
    render(<ProgramAnnouncementRail announcements={[base, { ...base, id: "notice-2" }]} />);
    const rail = screen.getByRole("list");
    const scrollTo = vi.fn();
    const cards = rail.querySelectorAll("li");
    Object.defineProperties(rail, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, value: 120, writable: true },
      scrollTo: { configurable: true, value: scrollTo },
      getBoundingClientRect: { configurable: true, value: () => ({ left: 0 }) },
    });
    Object.defineProperty(cards[0], "getBoundingClientRect", { configurable: true, value: () => ({ left: -120 }) });
    Object.defineProperty(cards[1], "getBoundingClientRect", { configurable: true, value: () => ({ left: 212 }) });

    fireEvent.scroll(rail);
    fireEvent.click(screen.getByRole("button", { name: "다음 프로그램 공지" }));

    expect(scrollTo).toHaveBeenCalledWith({ left: 332, behavior: "smooth" });
  });

  it("마우스로 끌면 레일을 이동하고 드래그 직후 모달 실행을 막는다", () => {
    render(<ProgramAnnouncementRail announcements={[base, { ...base, id: "notice-2" }]} />);
    const rail = screen.getByRole("list");
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.defineProperties(rail, {
      scrollLeft: { configurable: true, value: 100, writable: true },
      setPointerCapture: { configurable: true, value: setPointerCapture },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: releasePointerCapture },
    });

    fireEvent.pointerDown(rail, { button: 0, pointerId: 7, pointerType: "mouse", clientX: 200 });
    expect(setPointerCapture).not.toHaveBeenCalled();
    fireEvent.pointerMove(rail, { pointerId: 7, pointerType: "mouse", clientX: 120 });
    fireEvent.pointerUp(rail, { pointerId: 7, pointerType: "mouse", clientX: 120 });

    expect(rail.scrollLeft).toBe(180);
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    expect(fireEvent.click(screen.getAllByRole("button", { name: /발표 일정 안내/ })[0]!)).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("공지가 없어도 빈 프로그램 공지 영역을 렌더링한다", () => {
    render(<ProgramAnnouncementRail announcements={[]} />);

    expect(screen.getByRole("region", { name: "프로그램 공지" })).toBeInTheDocument();
    expect(screen.getByText("등록된 공지가 없습니다")).toBeInTheDocument();
    expect(screen.queryByText(/총\s*0건/)).not.toBeInTheDocument();
  });
});
