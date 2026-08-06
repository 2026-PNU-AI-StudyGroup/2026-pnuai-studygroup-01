import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExplorerHero } from "@/shared/ui/explorer-hero";

describe("ExplorerHero", () => {
  it("원형 표식 없이 제목만 렌더링한다", () => {
    const { container } = render(<ExplorerHero title="가입 정보 입력" />);

    expect(screen.getByRole("heading", { level: 1, name: "가입 정보 입력" })).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).not.toBeInTheDocument();
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("문맥과 설명 사이의 구분점은 둘 다 있을 때만 표시한다", () => {
    const { rerender } = render(<ExplorerHero title="프로젝트" context="캡스톤" />);

    expect(screen.getByText("캡스톤")).not.toHaveTextContent("·");

    rerender(<ExplorerHero title="프로젝트" context="캡스톤" description="모집 중" />);
    expect(screen.getByText(/캡스톤/)).toHaveTextContent("캡스톤 · 모집 중");
  });
});
