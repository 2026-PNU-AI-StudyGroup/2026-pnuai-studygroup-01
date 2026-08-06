import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";

describe("ProjectDetailShell", () => {
  it("프로젝트 상세를 거대한 카드로 감싸지 않고 cover와 본문, 정보 rail로 나눈다", () => {
    render(
      <ProjectDetailShell
        cover={<div>cover</div>}
        marker={<svg />}
        heading={<h1>프로젝트 제목</h1>}
        headerAside={<p>지원 정보</p>}
        railLabelledBy="schedule-title"
        rail={<h2 id="schedule-title">프로젝트 일정</h2>}
      >
        <section>프로젝트 소개</section>
      </ProjectDetailShell>,
    );

    const article = screen.getByRole("article");
    expect(article).not.toHaveClass("rounded-[var(--radius-panel)]");
    expect(article).not.toHaveClass("bg-white");
    expect(screen.getByText("cover").parentElement?.className).not.toContain("min-h-");
    expect(screen.getByRole("heading", { name: "프로젝트 제목" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "프로젝트 일정" })).toBeInTheDocument();
    expect(screen.getByText("프로젝트 소개")).toBeInTheDocument();
  });

  it("cover가 없으면 장식 영역 없이 제목과 핵심 정보를 먼저 렌더링한다", () => {
    render(
      <ProjectDetailShell
        heading={<h1>프로젝트 제목</h1>}
        headerAside={<p>지원 정보</p>}
        railLabelledBy="schedule-title"
        rail={<h2 id="schedule-title">프로젝트 일정</h2>}
      >
        <section>프로젝트 소개</section>
      </ProjectDetailShell>,
    );

    const article = screen.getByRole("article");
    expect(article.firstElementChild).toContainElement(screen.getByRole("heading", { name: "프로젝트 제목" }));
    expect(screen.queryByText("cover")).not.toBeInTheDocument();
  });
});
