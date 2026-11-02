import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfessorSidebar } from "@/app/_components/professor-sidebar";
import { ProfessorWorkspace } from "@/app/_components/professor-workspace";

describe("ProfessorWorkspace", () => {
  it("세부 화면의 문맥을 제목 위 eyebrow로 노출한다", () => {
    const { container } = render(
      <ProfessorWorkspace
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
    expect(screen.queryByRole("navigation", { name: "프로젝트 운영 흐름" })).not.toBeInTheDocument();
    expect(container.querySelector("main main")).not.toBeInTheDocument();
  });

  it("eyebrow와 설명 없이 제목만 제공할 수 있다", () => {
    const { container } = render(
      <ProfessorWorkspace title="새 프로젝트 주제">
        <p>주제 작성 양식</p>
      </ProfessorWorkspace>,
    );

    const header = container.querySelector("header");
    expect(header).toHaveTextContent("새 프로젝트 주제");
    expect(header?.querySelector("p")).not.toBeInTheDocument();
  });
});

describe("ProfessorSidebar", () => {
  it("세부 화면에서도 상위 업무를 현재 메뉴로 표시한다", () => {
    render(<ProfessorSidebar currentPath="/professor/topics/new" role="PROFESSOR" />);

    const navigation = screen.getByRole("navigation", { name: "교수 업무" });
    expect(within(navigation).getAllByRole("link", { name: /프로젝트 주제/ })).toHaveLength(2);
    for (const link of within(navigation).getAllByRole("link", { name: /프로젝트 주제/ })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
  });

  it("학생 조교에게 교수 전용 학생 등록 메뉴를 노출하지 않는다", () => {
    render(<ProfessorSidebar currentPath="/professor/applications" role="STUDENT" />);

    expect(screen.getByRole("navigation", { name: "조교 업무" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /학생 등록/ })).not.toBeInTheDocument();
  });
});
