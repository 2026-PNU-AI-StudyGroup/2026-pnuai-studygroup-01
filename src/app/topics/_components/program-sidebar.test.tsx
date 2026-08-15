import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";

const items = [{
  id: "hackathon-2026",
  name: "창의융합 해커톤 2026",
  icon: "FOLDER" as const,
  category: "PNU 창의융합해커톤",
  startYear: 2026,
  status: "active" as const,
  href: "/topics?programId=hackathon-2026",
}, {
  id: "hackathon-2025",
  name: "창의융합 해커톤 2025",
  icon: "FOLDER" as const,
  category: "PNU 창의융합해커톤",
  startYear: 2025,
  status: "past" as const,
  href: "/topics?view=past&programId=hackathon-2025",
}, {
  id: "capstone-2025",
  name: "캡스톤 2025",
  icon: "GRADUATION_CAP" as const,
  category: "캡스톤",
  startYear: 2025,
  status: "past" as const,
  href: "/topics?view=past&programId=capstone-2025",
}];

describe("ProgramSidebar", () => {
  it("프로그램을 대분류별 접이식 목록으로 묶고 분류 안에서 연도별로 정리한다", () => {
    const { container } = render(<ProgramSidebar items={items} />);
    const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    // 대분류가 최상위 그룹 헤더로 노출된다.
    expect(within(navigation).getByRole("button", { name: "PNU 창의융합해커톤" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "캡스톤" })).toBeInTheDocument();
    // 첫 대분류(최근 연도 보유)가 열려 있고 그 안에 프로그램이 최신순으로 보인다.
    const openGroup = within(navigation).getByRole("button", { name: "PNU 창의융합해커톤" });
    expect(openGroup).toHaveAttribute("aria-expanded", "true");
    expect(within(navigation).getByText("창의융합 해커톤 2026")).toBeInTheDocument();
    expect(within(navigation).getByText("진행 중")).toBeInTheDocument();
    expect(within(navigation).getAllByText("종료").length).toBeGreaterThan(0);
    expect(container.querySelector("summary")).toHaveTextContent("프로그램프로그램 없음");
  });

  it("선택된 프로그램의 대분류를 펼치고 링크 선택 상태를 표시한다", () => {
    const { container } = render(<ProgramSidebar items={items} selectedId="capstone-2025" />);
    const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    const selectedRow = within(navigation).getByText("캡스톤 2025").closest('[aria-current="page"]');
    expect(selectedRow).toBeInTheDocument();
    expect(selectedRow?.tagName).toBe("DIV");
    expect(selectedRow).not.toHaveAttribute("href");
    expect(within(navigation).getByRole("button", { name: "캡스톤" })).toHaveAttribute("aria-expanded", "true");
    expect(within(navigation).getByRole("button", { name: "PNU 창의융합해커톤" })).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector("summary")).toHaveTextContent("프로그램캡스톤 2025종료");
  });

  it("관리 화면에서는 선택된 프로그램도 탐색 화면으로 나가는 링크로 유지한다", () => {
    render(<ProgramSidebar items={items} selectedId="capstone-2025" selectedItemLinkable />);

    expect(screen.getAllByRole("link", { name: /캡스톤 2025/ }).some((link) => (
      link.getAttribute("href") === "/topics?view=past&programId=capstone-2025"
    ))).toBe(true);
  });

  it("관리자에게 각 프로그램의 설정 링크를 별도 동작으로 제공한다", () => {
    render(<ProgramSidebar items={items} selectedId="capstone-2025" showSettings />);
    const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    expect(screen.getAllByRole("link", { name: "새 프로그램 추가" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "새 프로그램 추가" })[0]).toHaveAttribute(
      "href",
      "/topics/manage/new",
    );
    expect(within(navigation).getByRole("link", { name: "캡스톤 2025 설정" })).toHaveAttribute(
      "href",
      "/topics/manage/capstone-2025",
    );
    expect(within(navigation).getByRole("link", { name: "창의융합 해커톤 2026 설정", hidden: true })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("비공개 프로그램은 진행·투표 점 대신 같은 위치에 자물쇠를 표시한다", () => {
    const { container } = render(<ProgramSidebar items={[{ ...items[0], visibility: "private", votingEndsAt: "2026-08-10T09:00:00+09:00" }]} />);
    expect(container.querySelector('[data-program-status="private"]')).toBeInTheDocument();
    expect(screen.getAllByText("비공개").length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: "투표 진행 프로그램" })).not.toBeInTheDocument();
  });

  it("승인 대기가 있는 프로그램에만 경고 색상의 건수를 표시한다", () => {
    const { rerender } = render(<ProgramSidebar items={[{ ...items[0], pendingApprovalCount: 2 }]} />);

    expect(screen.getAllByText(/승인 대기/)).toHaveLength(2);
    expect(screen.getAllByText(/승인 대기/)[0]).toHaveTextContent("승인 대기 2건");

    rerender(<ProgramSidebar items={[{ ...items[0], pendingApprovalCount: 0 }]} />);
    expect(screen.queryByText(/승인 대기/)).not.toBeInTheDocument();
  });

  it("투표 중인 프로그램들을 최상단 카드로 강조하면서 각 대분류 목록에도 유지한다", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <ProgramSidebar
          selectedId="capstone-2025"
          items={[
            { ...items[0], votingEndsAt: "2026-08-10T09:00:00+09:00" },
            { ...items[2], votingEndsAt: "2026-08-10T09:00:00+09:00" },
          ]}
        />,
      );
      const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });
      const carousel = within(navigation).getByRole("region", { name: "투표 진행 프로그램" });

      expect(within(carousel).getByText("투표 진행 중")).toBeInTheDocument();
      expect(within(carousel).getByRole("heading", { name: "창의융합 해커톤 2026" })).toBeInTheDocument();
      expect(within(carousel).getByRole("link", { name: "투표하러 가기" })).toHaveAttribute("href", "/topics?programId=hackathon-2026");
      expect(within(carousel).getByRole("button", { name: "다음 투표 프로그램" })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(6000));

      expect(within(carousel).getByRole("heading", { name: "캡스톤 2025" })).toBeInTheDocument();
      expect(within(carousel).getByRole("link", { name: "투표하러 가기" })).toHaveAttribute("href", "/topics?view=past&programId=capstone-2025");
      // 선택된 대분류(캡스톤) 목록에도 프로그램이 유지된다.
      expect(within(navigation).getByRole("button", { name: "캡스톤" })).toHaveAttribute("aria-expanded", "true");
      expect(within(navigation).getAllByText("투표 중").length).toBeGreaterThan(0);
      expect(container.querySelector("summary")).toHaveTextContent("프로그램캡스톤 2025투표 중");
    } finally {
      vi.useRealTimers();
    }
  });

  it("다른 대분류를 열 때 기존 대분류를 닫고 링크를 키보드 탐색에서 제외한다", () => {
    render(<ProgramSidebar items={items} />);
    const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    const hackathon = within(navigation).getByRole("button", { name: "PNU 창의융합해커톤" });
    const capstone = within(navigation).getByRole("button", { name: "캡스톤" });
    const hackathonProgram = within(navigation).getByText("창의융합 해커톤 2026").closest("a");
    const capstoneProgram = within(navigation).getByText("캡스톤 2025").closest("a");

    expect(hackathon).toHaveAttribute("aria-expanded", "true");
    expect(capstone).toHaveAttribute("aria-expanded", "false");
    expect(capstoneProgram).toHaveAttribute("tabindex", "-1");

    fireEvent.click(capstone);

    expect(hackathon).toHaveAttribute("aria-expanded", "false");
    expect(capstone).toHaveAttribute("aria-expanded", "true");
    expect(hackathonProgram).toHaveAttribute("tabindex", "-1");
    expect(capstoneProgram).not.toHaveAttribute("tabindex");
  });

  it("현재 열린 대분류가 새 items 집합에서 사라지면 첫 새 대분류를 연다", () => {
    const { rerender } = render(<ProgramSidebar items={items} />);
    let navigation = screen.getByRole("navigation", { name: "프로그램 선택" });
    fireEvent.click(within(navigation).getByRole("button", { name: "캡스톤" }));
    expect(within(navigation).getByRole("button", { name: "캡스톤" })).toHaveAttribute("aria-expanded", "true");

    rerender(
      <ProgramSidebar
        items={[
          { ...items[0], id: "contest-2024", name: "AI 경진대회 2024", category: "AI 경진대회", startYear: 2024 },
        ]}
      />,
    );
    navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    expect(within(navigation).getByRole("button", { name: "AI 경진대회" })).toHaveAttribute("aria-expanded", "true");
    expect(within(navigation).getByText("AI 경진대회 2024").closest("a")).not.toHaveAttribute("tabindex");
  });
});
