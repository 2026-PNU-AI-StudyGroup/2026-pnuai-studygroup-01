import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPortalHero, ProjectStatusNavigation } from "@/app/topics/_components/project-portal-chrome";
import { ProjectViewTabs } from "@/app/topics/_components/project-view-tabs";

describe("ProjectStatusNavigation", () => {
  it("상태를 바꿔도 프로그램·검색·정렬 조건을 보존한다", () => {
    render(<ProjectStatusNavigation phase="RECRUITING" counts={{ ACTIVE: 12, RECRUITING: 5, CLOSING_SOON: 2 }} programId="program-1" query="번역" sort="DEADLINE" />);

    const closing = screen.getByRole("link", { name: "마감 임박 2" });
    expect(closing).toHaveAttribute("href", "/topics?phase=CLOSING_SOON&programId=program-1&q=%EB%B2%88%EC%97%AD&sort=DEADLINE");
    expect(screen.getByRole("link", { name: "모집 중 5" })).toHaveAttribute("aria-current", "page");
  });
});

describe("ProjectViewTabs", () => {
  it("진행 중과 지난 프로젝트를 독립된 상단 탭으로 제공한다", () => {
    render(<ProjectViewTabs view="active" query="번역" />);
    expect(screen.getByRole("link", { name: "진행 중 프로젝트" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "지난 프로젝트" })).toHaveAttribute("href", "/topics?view=past&q=%EB%B2%88%EC%97%AD");
  });
});

describe("ProjectPortalHero", () => {
  it("현재 탐색 화면의 히어로를 유지한다", () => {
    render(<ProjectPortalHero view="active" />);
    expect(screen.getByRole("heading", { name: "프로젝트" })).toBeInTheDocument();
  });
});
