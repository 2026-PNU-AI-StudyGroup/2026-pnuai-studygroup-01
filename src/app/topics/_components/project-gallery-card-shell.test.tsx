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
});
