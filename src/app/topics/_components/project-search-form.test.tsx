import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";

describe("ProjectSearchForm", () => {
  it.each([
    ["active", "프로젝트명, 기술 스택, 교수명으로 검색"],
    ["past", "프로젝트명, 기술 스택, 교수명으로 검색"],
  ] as const)("%s 프로젝트 검색에 같은 검색창을 사용한다", (view, placeholder) => {
    render(<ProjectSearchForm view={view} query="" />);

    expect(screen.getByRole("searchbox", { name: "프로젝트 검색" })).toHaveAttribute("placeholder", placeholder);
    expect(screen.getByRole("button", { name: "검색" })).toBeInTheDocument();
  });

  it("지난 프로젝트 검색은 화면 구분만 보존하고 분류 조건을 만들지 않는다", () => {
    const { container } = render(<ProjectSearchForm view="past" programId="program-1" query="번역" />);

    expect(container.querySelector('input[name="view"]')).toHaveValue("past");
    expect(container.querySelector('input[name="programId"]')).toHaveValue("program-1");
    expect(container.querySelector('input[name="category"]')).not.toBeInTheDocument();
  });
});
