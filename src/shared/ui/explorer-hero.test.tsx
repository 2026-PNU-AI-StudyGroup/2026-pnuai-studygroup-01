import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Link from "next/link";

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

  it("확장 정보는 검색 같은 동작 영역과 별도 행에 둔다", () => {
    const { container } = render(
      <ExplorerHero
        title="프로젝트"
        action={<button type="button">검색</button>}
        details={<details><summary>프로그램 정보</summary><p>운영 기간</p></details>}
      />,
    );

    const section = container.querySelector("section");
    const primaryRow = section?.firstElementChild;
    const disclosure = screen.getByText("프로그램 정보").closest("details");

    expect(primaryRow).toContainElement(screen.getByRole("button", { name: "검색" }));
    expect(primaryRow).not.toContainElement(disclosure);
    expect(primaryRow?.nextElementSibling).toContainElement(disclosure);
  });

  it("제목 전용 동작은 제목 바로 옆에 둔다", () => {
    render(
      <ExplorerHero
        title="AI 해커톤"
        titleAction={<Link href="/admin/programs/program-1" aria-label="AI 해커톤 관리">설정</Link>}
        action={<button type="button">검색</button>}
      />,
    );

    const heading = screen.getByRole("heading", { name: "AI 해커톤" });
    const manage = screen.getByRole("link", { name: "AI 해커톤 관리" });
    expect(heading.parentElement).toContainElement(manage);
    expect(heading.parentElement).not.toContainElement(screen.getByRole("button", { name: "검색" }));
  });
});
