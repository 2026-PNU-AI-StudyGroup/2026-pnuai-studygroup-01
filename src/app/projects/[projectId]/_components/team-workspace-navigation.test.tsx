import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamWorkspaceNavigation } from "@/app/projects/[projectId]/_components/team-workspace-navigation";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

describe("TeamWorkspaceNavigation", () => {
  beforeEach(() => usePathname.mockReturnValue("/projects/team-1"));

  it("서로 다른 프로젝트 작업을 독립 경로로 안내한다", () => {
    render(<TeamWorkspaceNavigation projectId="team-1" advisorEnabled />);

    expect(screen.getByRole("link", { name: "개요" })).toHaveAttribute("href", "/projects/team-1");
    expect(screen.getByRole("link", { name: "할 일" })).toHaveAttribute("href", "/projects/team-1/tasks");
    expect(screen.getByRole("link", { name: "팀 대화" })).toHaveAttribute("href", "/projects/team-1/discussion");
    expect(screen.getByRole("link", { name: "회의·검토" })).toHaveAttribute("href", "/projects/team-1/requests");
    expect(screen.getByRole("link", { name: "회의·검토 모바일 메뉴" })).toHaveAttribute("href", "/projects/team-1/requests");
    expect(screen.getByRole("link", { name: "보고서" })).toHaveAttribute("href", "/projects/team-1/reports");
    expect(screen.getByRole("link", { name: "결과물" })).toHaveAttribute("href", "/projects/team-1/artifacts");
    expect(screen.queryByRole("link", { name: "공지" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "공지 모바일 메뉴" })).not.toBeInTheDocument();
  });

  it("현재 회의·검토 작업을 모바일과 데스크톱에서 활성 상태로 표시한다", () => {
    usePathname.mockReturnValue("/projects/team-1/requests");
    render(<TeamWorkspaceNavigation projectId="team-1" advisorEnabled />);

    expect(screen.getByRole("link", { name: "회의·검토" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "회의·검토 모바일 메뉴" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "보고서" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "보고서 모바일 메뉴" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "개요" })).not.toHaveAttribute("aria-current");
  });

  it("개요 아이콘은 네 칸을 같은 크기로 그린다", () => {
    render(<TeamWorkspaceNavigation projectId="team-1" advisorEnabled />);

    expect(screen.getByRole("link", { name: "개요" }).querySelector("path")).toHaveAttribute(
      "d",
      "M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z",
    );
  });

  it("지도교수가 없는 프로젝트에서는 지도 요청 경로를 노출하지 않는다", () => {
    render(<TeamWorkspaceNavigation projectId="team-1" advisorEnabled={false} />);

    expect(screen.queryByRole("link", { name: "회의·검토" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "회의·검토 모바일 메뉴" })).not.toBeInTheDocument();
  });
});
