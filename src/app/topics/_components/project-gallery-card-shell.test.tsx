import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectGalleryCardShell } from "@/app/topics/_components/project-gallery-card-shell";

describe("ProjectGalleryCardShell", () => {
  it("분과가 지정된 프로젝트에만 분과명을 표시한다", () => {
    const { rerender } = render(
      <ProjectGalleryCardShell
        id="topic-1"
        title="분과 프로젝트"
        href="/topics/topic-1"
        programName="캡스톤"
        divisionName="융합"
        description="설명"
        coverStatus={<span>모집 중</span>}
      />,
    );

    expect(screen.getByRole("article")).toHaveTextContent("캡스톤 · 융합");
    expect(screen.getByText("모집 중").parentElement).toHaveClass("absolute", "left-3", "top-3");

    rerender(
      <ProjectGalleryCardShell
        id="topic-2"
        title="미지정 프로젝트"
        href="/topics/topic-2"
        programName="캡스톤"
        divisionName={null}
        description="설명"
      />,
    );

    const card = screen.getByRole("article");
    expect(card).toHaveTextContent("캡스톤");
    expect(card).not.toHaveTextContent("미분과");
    expect(card).not.toHaveTextContent("캡스톤 ·");
  });

  it("같은 분과 프로젝트는 표지 색을 함께 쓴다", () => {
    // 색이 장식이 아니라 분과를 말하게 한다. 목록에서 분과가 덩어리로 보인다.
    const card = (id: string, divisionId: string | null) => (
      <ProjectGalleryCardShell
        id={id}
        title={id}
        href={`/topics/${id}`}
        programName="캡스톤"
        divisionId={divisionId}
        divisionName={divisionId ? "융합" : null}
        description="설명"
      />
    );
    const tone = () => document.querySelector("[data-cover-tone]")!.getAttribute("data-cover-tone");

    const { rerender } = render(card("topic-1", "division-a"));
    const first = tone();
    rerender(card("topic-2", "division-a"));
    const second = tone();
    rerender(card("topic-3", "division-b"));
    const other = tone();

    expect(second).toBe(first);
    expect(other).not.toBe(first);
  });

  it("분과가 없으면 프로젝트마다 색이 갈린다", () => {
    // 분과를 안 쓰는 프로그램에서도 카드가 서로 구분돼야 한다.
    const card = (id: string) => (
      <ProjectGalleryCardShell id={id} title={id} href={`/topics/${id}`} programName="캡스톤" divisionName={null} description="설명" />
    );
    const tone = () => document.querySelector("[data-cover-tone]")!.getAttribute("data-cover-tone");

    const { rerender } = render(card("topic-1"));
    const first = tone();
    rerender(card("topic-2"));

    expect(tone()).not.toBe(first);
  });
});
