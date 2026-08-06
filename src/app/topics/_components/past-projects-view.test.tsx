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
  it("썸네일 카드에는 프로그램 정보 대신 제목 아래 교수 이름만 표시한다", () => {
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
    expect(article).not.toHaveTextContent("CSE 캡스톤 디자인");
    expect(article).not.toHaveTextContent("CSE 캡스톤디자인 2025");
    expect(screen.getByText("김도윤")).toBeInTheDocument();
    expect(article).not.toHaveTextContent("김도윤 교수");
    expect(detailLink).toHaveAttribute(
      "href",
      "/topics/archive/project-1",
    );
  });

  it("기존 구분선과 팀, 참여 구조를 유지하고 기술 태그와 연도는 제거한다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, artifacts: [{ id: "artifact-1", type: "POSTER", title: "발표 포스터" }] }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    const article = screen.getByRole("article");
    const title = screen.getByRole("heading", { name: "실내 길찾기" });
    const professor = screen.getByText("김도윤");
    const description = screen.getByText("프로젝트 설명");
    const details = article.querySelector("dl");

    expect(details).toHaveClass("border-y");
    expect(details).toHaveTextContent("프로젝트 팀");
    expect(details).toHaveTextContent("모두의 길");
    expect(details).toHaveTextContent("참여 · 결과물");
    expect(details).toHaveTextContent("1명 · 1개");
    expect(description).toHaveClass("line-clamp-2");
    expect(screen.queryByRole("list", { name: "프로젝트 기술" })).not.toBeInTheDocument();
    expect(article).not.toHaveTextContent("TypeScript");
    expect(article).not.toHaveTextContent("2025");
    if (!details) throw new Error("카드 상세 정보를 찾을 수 없습니다.");
    expect(title.compareDocumentPosition(professor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(professor.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(description.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("지도교수가 없는 프로그램은 교수 메타를 숨긴다", () => {
    render(
      <PastProjectsView
        projects={[{ ...project, advisorEnabled: false }]}
        total={1}
        page={1}
        totalPages={1}
        query=""
      />,
    );

    expect(screen.queryByText("김도윤")).not.toBeInTheDocument();
    expect(screen.getByText("프로젝트 설명")).toHaveClass("line-clamp-2");
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
    expect(article?.querySelector("[data-project-cover-fallback]")).toBeInTheDocument();
    expect(article?.querySelector("[data-project-cover] [data-pnu-mark]")).toBeInTheDocument();
    expect(article?.querySelector("[data-project-cover-fallback]")).toHaveTextContent("CSE 캡스톤디자인 2025");
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
