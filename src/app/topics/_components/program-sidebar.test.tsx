import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";

const items = [{
  id: "program-2026",
  name: "AI 부스터 2026",
  category: "교육 프로그램",
  academicYear: 2026,
  status: "active" as const,
  href: "/topics?programId=program-2026",
}, {
  id: "program-2025",
  name: "캡스톤 2025",
  category: "캡스톤",
  academicYear: 2025,
  status: "past" as const,
  href: "/topics?view=past&programId=program-2025",
}];

describe("ProgramSidebar", () => {
  it("프로그램을 학년도별 접이식 목록과 상태 태그로 제공한다", () => {
    render(<ProgramSidebar items={items} allHref="/topics" />);

    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toBeInTheDocument();
    expect(screen.getByText("종료")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "전체 프로젝트" })).not.toBeInTheDocument();
  });

  it("선택된 프로그램의 학년도를 펼치고 링크 선택 상태를 표시한다", () => {
    render(<ProgramSidebar items={items} selectedId="program-2025" allHref="/topics?view=past" />);

    expect(screen.getByRole("link", { name: "캡스톤 2025종료캡스톤" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "2025" })).toHaveAttribute("aria-expanded", "true");
  });

  it("다른 연도를 열 때 기존 연도를 모션 상태로 닫고 링크를 키보드 탐색에서 제외한다", () => {
    render(<ProgramSidebar items={items} allHref="/topics" />);

    const year2026 = screen.getByRole("button", { name: "2026" });
    const year2025 = screen.getByRole("button", { name: "2025" });
    const program2026 = screen.getByText("AI 부스터 2026").closest("a");
    const program2025 = screen.getByText("캡스톤 2025").closest("a");

    expect(year2026).toHaveAttribute("aria-expanded", "true");
    expect(year2025).toHaveAttribute("aria-expanded", "false");
    expect(program2025).toHaveAttribute("tabindex", "-1");

    fireEvent.click(year2025);

    expect(year2026).toHaveAttribute("aria-expanded", "false");
    expect(year2025).toHaveAttribute("aria-expanded", "true");
    expect(program2026).toHaveAttribute("tabindex", "-1");
    expect(program2025).not.toHaveAttribute("tabindex");
  });
});
