import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectExplorerLayout } from "@/app/topics/project-explorer-layout";

describe("ProjectExplorerLayout", () => {
  it("학생에게 진행 중과 종료된 프로젝트 전환 및 실제 보조 경로를 제공한다", () => {
    render(<ProjectExplorerLayout role="STUDENT" view="active"><p>프로젝트 내용</p></ProjectExplorerLayout>);

    const activeLinks = screen.getAllByRole("link", { name: /진행 중/ });
    expect(activeLinks).toHaveLength(2);
    expect(activeLinks.every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getAllByRole("link", { name: /종료/ })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "팀원 모집" })).toHaveAttribute("href", "/recruitments");
  });

  it("교수에게 종료된 프로젝트 선택과 지도 프로젝트 경로를 제공한다", () => {
    render(<ProjectExplorerLayout role="PROFESSOR" view="past"><p>프로젝트 내용</p></ProjectExplorerLayout>);

    expect(screen.getAllByRole("link", { name: /종료/ }).every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getByRole("link", { name: "지도 프로젝트" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "팀원 모집" })).not.toBeInTheDocument();
  });
});
