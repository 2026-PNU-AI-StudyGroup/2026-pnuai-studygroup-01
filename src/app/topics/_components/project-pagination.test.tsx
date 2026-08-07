import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPagination } from "@/app/topics/_components/project-pagination";

describe("ProjectPagination", () => {
  it("현재 페이지와 전체 페이지 링크를 명확히 제공한다", () => {
    render(<ProjectPagination page={1} totalPages={4} href={(page) => `/topics?view=past&page=${page}`} ariaLabel="지난 프로젝트 페이지" />);

    expect(screen.getByText("1", { selector: "[aria-current='page']" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2 페이지" })).toHaveAttribute("href", "/topics?view=past&page=2");
    expect(screen.getByLabelText("이전 페이지")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "다음 페이지" })).toHaveAttribute("href", "/topics?view=past&page=2");
  });

  it("페이지가 많으면 현재 페이지 주변과 양 끝만 노출한다", () => {
    render(<ProjectPagination page={6} totalPages={12} href={(page) => `/topics?page=${page}`} ariaLabel="프로젝트 페이지" />);

    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "1 페이지" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "12 페이지" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "3 페이지" })).not.toBeInTheDocument();
  });
});
