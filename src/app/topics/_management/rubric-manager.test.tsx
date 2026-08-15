import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RubricManager } from "@/app/topics/_management/rubric-manager";

vi.mock("@/app/topics/_management/rubric-actions", () => ({
  archiveRubricAction: vi.fn(),
  createCriterionAction: vi.fn(),
  createRubricAction: vi.fn(),
  deleteCriterionAction: vi.fn(),
  moveCriterionAction: vi.fn(),
  moveRubricAction: vi.fn(),
  updateCriterionAction: vi.fn(),
  updateRubricAction: vi.fn(),
}));

const programId = "40000000-0000-4000-8000-000000000001";
const divisions = [{ id: "40000000-0000-4000-8000-000000000002", name: "창업 트랙" }];
const rubric = {
  id: "40000000-0000-4000-8000-000000000003",
  divisionId: null,
  title: "공식 평가",
  gradingDueAt: new Date("2026-08-20T09:00:00Z"),
  audience: "STAFF_ONLY" as const,
  criteria: [{ id: "40000000-0000-4000-8000-000000000004", label: "완성도", maxPoints: 10 }],
  scoreCount: 0,
};

describe("RubricManager", () => {
  it("생성 화면과 같은 빠른 추가 행, 요약 목록, 모달 편집 흐름을 사용한다", () => {
    render(<RubricManager programId={programId} divisions={divisions} rubrics={[rubric]} />);

    expect(screen.getByRole("combobox", { name: "새 채점표 적용 범위" })).toHaveTextContent("공통 채점표");
    expect(screen.queryByRole("button", { name: "채점표 추가" })).not.toBeInTheDocument();
    expect(screen.getByText(/공통 채점표.*항목 1개 \/ 10점/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "세부 설정" }));

    const dialog = screen.getByRole("dialog", { name: "채점표 세부 설정" });
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByText("평가 항목")).toBeVisible();
    expect(dialog.querySelector("details")).toBeNull();
  });

  it("점수가 저장된 채점표는 구조 변경을 잠그되 세부 설정은 열 수 있다", () => {
    render(<RubricManager programId={programId} divisions={[]} rubrics={[{ ...rubric, scoreCount: 1 }]} />);

    expect(screen.getByRole("button", { name: "공식 평가 채점표 삭제" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "세부 설정" }));

    const dialog = screen.getByRole("dialog", { name: "채점표 세부 설정" });
    expect(within(dialog).getByRole("textbox", { name: "채점표 제목" })).toHaveAttribute("readonly");
    expect(within(dialog).getByText("점수가 저장되어 평가 항목, 배점과 순서는 변경할 수 없습니다.")).toBeVisible();
  });
});
