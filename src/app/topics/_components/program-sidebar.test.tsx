import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";

const items = [{
  id: "program-2026",
  name: "AI 부스터 2026",
  category: "교육 프로그램",
  startYear: 2026,
  status: "active" as const,
  href: "/topics?programId=program-2026",
}, {
  id: "program-2025",
  name: "캡스톤 2025",
  category: "캡스톤",
  startYear: 2025,
  status: "past" as const,
  href: "/topics?view=past&programId=program-2025",
}];

describe("ProgramSidebar", () => {
  it("프로그램을 시작 연도별 접이식 목록과 상태 태그로 제공한다", () => {
    const { container } = render(<ProgramSidebar items={items} />);
    const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    expect(within(navigation).getByText("2026")).toBeInTheDocument();
    expect(within(navigation).getByText("2025")).toBeInTheDocument();
    expect(within(navigation).getByText("진행 중")).toBeInTheDocument();
    expect(within(navigation).getByText("종료")).toBeInTheDocument();
    expect(navigation.querySelectorAll("[data-program-mark]")).toHaveLength(2);
    expect(container.querySelector("summary")).toHaveTextContent("프로그램프로그램 없음");
    expect(screen.queryByRole("link", { name: "전체 프로젝트" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "전체 보기" })).not.toBeInTheDocument();
  });

  it("선택된 프로그램의 시작 연도를 펼치고 링크 선택 상태를 표시한다", () => {
    const { container } = render(<ProgramSidebar items={items} selectedId="program-2025" />);
    const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    const selectedRow = within(navigation).getByText("캡스톤 2025").closest('[aria-current="page"]');
    expect(selectedRow).toBeInTheDocument();
    expect(selectedRow?.tagName).toBe("DIV");
    expect(selectedRow).not.toHaveAttribute("href");
    expect(selectedRow?.querySelector("[data-program-mark] svg")).toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "캡스톤 2025종료캡스톤" })).not.toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "2025" })).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector("summary")).toHaveTextContent("프로그램캡스톤 2025종료");
    expect(screen.queryByRole("link", { name: "전체 보기" })).not.toBeInTheDocument();
  });

  it("다른 연도를 열 때 기존 연도를 모션 상태로 닫고 링크를 키보드 탐색에서 제외한다", () => {
    render(<ProgramSidebar items={items} />);
    const navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    const year2026 = within(navigation).getByRole("button", { name: "2026" });
    const year2025 = within(navigation).getByRole("button", { name: "2025" });
    const program2026 = within(navigation).getByText("AI 부스터 2026").closest("a");
    const program2025 = within(navigation).getByText("캡스톤 2025").closest("a");

    expect(year2026).toHaveAttribute("aria-expanded", "true");
    expect(year2025).toHaveAttribute("aria-expanded", "false");
    expect(program2025).toHaveAttribute("tabindex", "-1");

    fireEvent.click(year2025);

    expect(year2026).toHaveAttribute("aria-expanded", "false");
    expect(year2025).toHaveAttribute("aria-expanded", "true");
    expect(program2026).toHaveAttribute("tabindex", "-1");
    expect(program2025).not.toHaveAttribute("tabindex");
  });

  it("현재 열린 연도가 새 items 집합에서 사라지면 첫 새 연도를 연다", () => {
    const { rerender } = render(<ProgramSidebar items={items} />);
    let navigation = screen.getByRole("navigation", { name: "프로그램 선택" });
    fireEvent.click(within(navigation).getByRole("button", { name: "2025" }));
    expect(within(navigation).getByRole("button", { name: "2025" })).toHaveAttribute("aria-expanded", "true");

    rerender(
      <ProgramSidebar
        items={[
          { ...items[0], id: "program-2024", name: "AI 부스터 2024", startYear: 2024 },
          { ...items[1], id: "program-2023", name: "캡스톤 2023", startYear: 2023 },
        ]}
      />,
    );
    navigation = screen.getByRole("navigation", { name: "프로그램 선택" });

    expect(within(navigation).getByRole("button", { name: "2024" })).toHaveAttribute("aria-expanded", "true");
    expect(within(navigation).getByRole("button", { name: "2023" })).toHaveAttribute("aria-expanded", "false");
    expect(within(navigation).getByText("AI 부스터 2024").closest("a")).not.toHaveAttribute("tabindex");
    expect(navigation.querySelectorAll("[data-program-mark]")).toHaveLength(2);
  });
});
