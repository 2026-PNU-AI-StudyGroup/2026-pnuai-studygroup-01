import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";

describe("ProjectDetailShell", () => {
  it("머리, 숫자 판, 본문, 곁 정보를 한 글 안에 차례로 둔다", () => {
    render(
      <ProjectDetailShell
        header={<h1>프로젝트 제목</h1>}
        kpis={<p>숫자 판</p>}
        side={<section><h2>팀</h2></section>}
      >
        <section>프로젝트 소개</section>
      </ProjectDetailShell>,
    );

    const article = screen.getByRole("article");
    expect(article.firstElementChild).toContainElement(screen.getByRole("heading", { name: "프로젝트 제목" }));
    expect(screen.getByText("숫자 판")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "프로젝트 정보" })).toContainElement(screen.getByRole("heading", { name: "팀" }));
    expect(screen.getByText("프로젝트 소개")).toBeInTheDocument();
  });

  it("곁 정보가 없으면 옆 칸을 그리지 않는다", () => {
    render(<ProjectDetailShell header={<h1>프로젝트 제목</h1>}><section>프로젝트 소개</section></ProjectDetailShell>);

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
