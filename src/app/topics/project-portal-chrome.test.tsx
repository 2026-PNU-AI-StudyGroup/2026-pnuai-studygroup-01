import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPortalHero, ProjectStatusNavigation } from "@/app/topics/project-portal-chrome";

describe("ProjectStatusNavigation", () => {
  it("상태를 바꿔도 프로그램·검색·정렬 조건을 보존한다", () => {
    render(<ProjectStatusNavigation view="active" phase="RECRUITING" counts={{ ACTIVE: 12, RECRUITING: 5, CLOSING_SOON: 2 }} programId="program-1" query="번역" sort="DEADLINE" />);

    const closing = screen.getByRole("link", { name: "마감 임박 2" });
    expect(closing).toHaveAttribute("href", "/topics?phase=CLOSING_SOON&programId=program-1&q=%EB%B2%88%EC%97%AD&sort=DEADLINE");
    expect(screen.getByRole("link", { name: "모집 중 5" })).toHaveAttribute("aria-current", "page");
  });
});

describe("ProjectPortalHero", () => {
  it("현재와 지난 프로젝트의 탐색 목적을 구분한다", () => {
    const { rerender } = render(<ProjectPortalHero view="active" />);
    expect(screen.getByRole("heading", { name: "진행 중 프로젝트" })).toBeInTheDocument();

    rerender(<ProjectPortalHero view="past" />);
    expect(screen.getByRole("heading", { name: "지난 프로젝트" })).toBeInTheDocument();
    expect(screen.getByText(/결과물을 참고/)).toBeInTheDocument();
  });
});
