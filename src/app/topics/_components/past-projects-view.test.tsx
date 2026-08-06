import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";

const project: ArchivedProject = {
  id: "project-1",
  startYear: 2025,
  teamName: "모두의 길",
  programId: "program-1",
  programName: "CSE 캡스톤디자인 2025",
  programCategory: "CSE 캡스톤 디자인",
  topicTitle: "실내 길찾기",
  topicDescription: "프로젝트 설명",
  requiredSkills: ["TypeScript"],
  preferredSkills: [],
  professorName: "김도윤",
  advisorRole: "교수",
  advisorEnabled: true,
  memberNames: ["정하늘"],
  thumbnailPath: "/demo/archive/project.png",
  artifacts: [],
};

describe("PastProjectsView", () => {
  it("썸네일 카드에서도 프로그램 정보는 본문 한 곳에만 표시한다", () => {
    render(
      <PastProjectsView
        projects={[project]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const detailLink = screen.getByRole("link", { name: "실내 길찾기" });
    const article = detailLink.closest("article");
    expect(article?.querySelector("[data-project-cover]")).toBeInTheDocument();
    expect(article?.textContent?.match(/CSE 캡스톤 디자인 · CSE 캡스톤디자인 2025/g)).toHaveLength(1);
    expect(detailLink).toHaveAttribute(
      "href",
      "/topics/archive/project-1",
    );
  });

  it("썸네일이 없는 지난 프로젝트에도 대체 장식 커버를 유지한다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, thumbnailPath: undefined }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const article = screen.getByRole("link", { name: "실내 길찾기" }).closest("article");
    expect(article?.querySelector("[data-project-cover]")).toBeInTheDocument();
    expect(article?.querySelector("img")).not.toBeInTheDocument();
  });

  it("필터 결과가 비어도 같은 초기화 동작을 두 번 표시하지 않는다", () => {
    render(
      <PastProjectsView
        projects={[]}
        total={0}
        page={1}
        totalPages={1}
        query="길찾기"
        programId="program-1"
      />,
    );

    expect(screen.getAllByRole("link", { name: "조건 초기화" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "조건 초기화" })).toHaveAttribute("href", "/topics?view=past&programId=program-1");
    expect(screen.queryByRole("link", { name: "전체 프로젝트 보기" })).not.toBeInTheDocument();
  });
});
