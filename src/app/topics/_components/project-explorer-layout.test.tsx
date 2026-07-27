import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExplorerLayout } from "@/shared/ui/explorer-layout";

describe("ProjectExplorerLayout", () => {
  it("프로그램 사이드바와 탐색 콘텐츠를 함께 제공한다", () => {
    const { container } = render(
      <ExplorerLayout sidebar={<p>프로그램 목록</p>}>
        <p>프로젝트 내용</p>
      </ExplorerLayout>,
    );

    expect(screen.getByText("프로젝트 내용")).toBeInTheDocument();
    expect(screen.getByText("프로그램 목록")).toBeInTheDocument();
    expect(container.querySelector("aside")).toBeInTheDocument();
    expect(container.querySelector("main")).toHaveClass("min-h-[calc(100vh-4.5rem)]");
    expect(container.querySelector("main > div")).not.toHaveClass("max-w-[1560px]", "mx-auto");
  });
});
