import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfessorWorkspace } from "@/app/_components/professor-workspace";

describe("ProfessorWorkspace", () => {
  it("세부 화면의 문맥을 제목 위 eyebrow로 노출한다", () => {
    const { container } = render(
      <ProfessorWorkspace
        currentPath="/professor/topics/new"
        role="PROFESSOR"
        eyebrow="프로젝트 주제 · 신규 등록"
        title="새 프로젝트 주제"
        description="학생이 이해할 수 있는 주제를 작성합니다."
      >
        <p>주제 작성 양식</p>
      </ProfessorWorkspace>,
    );

    const eyebrow = screen.getByText("프로젝트 주제 · 신규 등록");
    const heading = screen.getByRole("heading", { level: 1, name: "새 프로젝트 주제" });

    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("주제 작성 양식")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "교수 업무" });
    expect(within(navigation).getAllByRole("link", { name: /프로젝트 주제/ })).toHaveLength(2);
    for (const link of within(navigation).getAllByRole("link", { name: /프로젝트 주제/ })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    expect(screen.queryByRole("navigation", { name: "프로젝트 운영 흐름" })).not.toBeInTheDocument();
    expect(container.querySelector("main main")).not.toBeInTheDocument();
  });

  it("학생 조교에게 교수 전용 학생 제안 메뉴를 노출하지 않는다", () => {
    render(
      <ProfessorWorkspace
        currentPath="/professor/applications"
        role="STUDENT"
        title="지원 검토"
        description="담당 프로젝트의 지원서를 검토합니다."
      >
        <p>지원서 목록</p>
      </ProfessorWorkspace>,
    );

    expect(screen.getByRole("navigation", { name: "조교 업무" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /학생 제안/ })).not.toBeInTheDocument();
  });

  it("eyebrow와 설명 없이 제목만 제공할 수 있다", () => {
    const { container } = render(
      <ProfessorWorkspace currentPath="/professor/topics/new" role="PROFESSOR" title="새 프로젝트 주제">
        <p>주제 작성 양식</p>
      </ProfessorWorkspace>,
    );

    const header = container.querySelector("header");
    expect(header).toHaveTextContent("새 프로젝트 주제");
    expect(header?.querySelector("p")).not.toBeInTheDocument();
  });
});
