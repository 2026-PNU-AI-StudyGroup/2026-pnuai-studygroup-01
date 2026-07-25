import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TeamWorkspaceLoading from "@/app/teams/[teamId]/loading";
import TeamsLoading from "@/app/teams/loading";

describe("authenticated route loading skeletons", () => {
  it("팀 목록 로딩 중에도 실제 앱 사이드바 골격을 유지한다", () => {
    const { container } = render(<TeamsLoading />);

    expect(screen.getByRole("status", { name: "팀 관리 화면을 불러오는 중" })).toHaveAttribute(
      "data-shell-skeleton",
      "app",
    );
    expect(container.querySelector('[data-shell-skeleton="team-context"]')).not.toBeInTheDocument();
  });

  it("프로젝트 작업공간 로딩 중에는 앱 레일과 팀 문맥 레일을 함께 유지한다", () => {
    const { container } = render(<TeamWorkspaceLoading />);

    expect(screen.getByRole("status", { name: "프로젝트 작업공간을 불러오는 중" })).toHaveAttribute(
      "data-shell-skeleton",
      "app",
    );
    expect(container.querySelector('[data-shell-skeleton="team-context"]')).toBeInTheDocument();
  });
});
