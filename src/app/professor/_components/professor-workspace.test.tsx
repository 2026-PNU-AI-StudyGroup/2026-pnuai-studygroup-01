import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfessorWorkspace } from "@/app/professor/_components/professor-workspace";

describe("ProfessorWorkspace", () => {
  it("세부 화면의 문맥을 제목 위 eyebrow로 노출한다", () => {
    render(
      <ProfessorWorkspace
        currentPath="/professor/topics/new"
        eyebrow="주제 설계 · 새로 만들기"
        title="새 프로젝트 주제"
        description="학생이 이해할 수 있는 주제를 작성합니다."
      >
        <p>주제 작성 양식</p>
      </ProfessorWorkspace>,
    );

    const eyebrow = screen.getByText("주제 설계 · 새로 만들기");
    const heading = screen.getByRole("heading", { level: 1, name: "새 프로젝트 주제" });

    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("주제 작성 양식")).toBeInTheDocument();
  });
});
