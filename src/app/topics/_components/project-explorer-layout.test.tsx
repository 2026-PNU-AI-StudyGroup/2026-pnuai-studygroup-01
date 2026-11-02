import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExplorerLayout } from "@/shared/ui/explorer-layout";

describe("ProjectExplorerLayout", () => {
  it("탐색 콘텐츠를 본문 칸에 담는다", () => {
    const { container } = render(
      <ExplorerLayout>
        <p>프로젝트 내용</p>
      </ExplorerLayout>,
    );

    expect(screen.getByText("프로젝트 내용")).toBeInTheDocument();
    // 프로그램 목록은 AppShell 의 왼쪽 메뉴 칸으로 옮겼다.
    expect(container.querySelector("aside")).not.toBeInTheDocument();
    expect(container.querySelector("main")).toHaveClass("min-h-[calc(100vh-4.5rem)]");
    expect(container.querySelector("main > div")).not.toHaveClass("max-w-[1560px]", "mx-auto");
  });
});
