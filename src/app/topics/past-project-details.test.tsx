import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PastProjectDetails } from "@/app/topics/past-project-details";

describe("지난 프로젝트 상세 흐름", () => {
  it("목록 행을 늘리지 않고 설명과 결과물을 모달에 표시한다", () => {
    const { container } = render(<PastProjectDetails project={{
      id: "project",
      academicYear: 2025,
      term: "SECOND",
      teamName: "PNU Navi",
      programName: "CSE 캡스톤 디자인",
      programCategory: "캡스톤",
      topicTitle: "스마트 캠퍼스 내비게이션",
      topicDescription: "교내 이동을 돕는 서비스",
      requiredSkills: ["TypeScript"],
      preferredSkills: [],
      professorName: "김교수",
      memberNames: ["김학생", "이학생"],
      artifacts: [{ id: "artifact", type: "SOURCE_CODE", title: "GitHub", externalUrl: "https://github.com/example/project" }],
    }} />);

    expect(container.querySelector("details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "설명과 결과물 보기" }));
    expect(screen.getByRole("dialog", { name: "스마트 캠퍼스 내비게이션" })).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: /소스 코드 · GitHub/ })).toHaveAttribute("href", "https://github.com/example/project");
  });
});
