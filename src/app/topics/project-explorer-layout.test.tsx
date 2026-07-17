import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectExplorerLayout } from "@/app/topics/project-explorer-layout";

describe("ProjectExplorerLayout", () => {
  it("탐색 콘텐츠를 좌측 관리 사이드바 없이 포털 본문으로 제공한다", () => {
    const { container } = render(<ProjectExplorerLayout><p>프로젝트 내용</p></ProjectExplorerLayout>);

    expect(screen.getByText("프로젝트 내용")).toBeInTheDocument();
    expect(container.querySelector("aside")).not.toBeInTheDocument();
    expect(container.querySelector("main")).toHaveClass("content-shell");
  });
});
