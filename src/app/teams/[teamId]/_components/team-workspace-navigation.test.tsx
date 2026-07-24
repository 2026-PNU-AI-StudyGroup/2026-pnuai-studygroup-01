import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamWorkspaceNavigation } from "@/app/teams/[teamId]/_components/team-workspace-navigation";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

describe("TeamWorkspaceNavigation", () => {
  beforeEach(() => usePathname.mockReturnValue("/teams/team-1"));

  it("서로 다른 프로젝트 작업을 독립 경로로 안내한다", () => {
    render(<TeamWorkspaceNavigation teamId="team-1" />);

    expect(screen.getByRole("link", { name: "개요" })).toHaveAttribute("href", "/teams/team-1");
    expect(screen.getByRole("link", { name: "마일스톤" })).toHaveAttribute("href", "/teams/team-1/milestones");
    expect(screen.getByRole("link", { name: "진행 기록" })).toHaveAttribute("href", "/teams/team-1/progress");
    expect(screen.getByRole("link", { name: "토론" })).toHaveAttribute("href", "/teams/team-1/discussion");
    expect(screen.getByRole("link", { name: "보고서" })).toHaveAttribute("href", "/teams/team-1/reports");
    expect(screen.getByRole("link", { name: "결과물" })).toHaveAttribute("href", "/teams/team-1/artifacts");
  });

  it("현재 하위 작업만 활성 상태로 표시한다", () => {
    usePathname.mockReturnValue("/teams/team-1/reports");
    render(<TeamWorkspaceNavigation teamId="team-1" />);

    expect(screen.getByRole("link", { name: "보고서" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "개요" })).not.toHaveAttribute("aria-current");
  });
});
