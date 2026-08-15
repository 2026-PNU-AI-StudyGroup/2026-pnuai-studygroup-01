import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgramCreateRubricBuilder, type ProgramCreateRubricDraft } from "@/app/topics/_management/program-create-definition-builders";

const rubric: ProgramCreateRubricDraft = {
  id: "rubric-1",
  divisionName: null,
  title: "공식 평가",
  gradingDueAt: "2026-08-20T18:00",
  audience: "STAFF_ONLY",
  criteria: [{ id: "criterion-1", label: "완성도", maxPoints: 10 }],
};

describe("ProgramCreateRubricBuilder", () => {
  it("빠른 추가 행에서 채점표 적용 범위를 먼저 선택할 수 있다", () => {
    render(<ProgramCreateRubricBuilder divisionNames={["창업 트랙"]} rubrics={[]} onChange={vi.fn()} />);

    const scope = screen.getByRole("combobox", { name: "새 채점표 적용 범위" });
    expect(scope).toHaveTextContent("공통 채점표");
    fireEvent.click(scope);
    fireEvent.click(screen.getByRole("option", { name: /창업 트랙/ }));

    expect(scope).toHaveTextContent("창업 트랙");
  });

  it("목록은 요약만 보여주고 세부 설정은 저장 전까지 모달 초안으로 유지한다", () => {
    const onChange = vi.fn();
    render(<ProgramCreateRubricBuilder divisionNames={["창업 트랙"]} rubrics={[rubric]} onChange={onChange} />);

    expect(screen.queryByRole("dialog", { name: "채점표 세부 설정" })).not.toBeInTheDocument();
    expect(screen.getByText("공통 채점표 · 2026. 08. 20. 18:00 · 관계자 전용 · 항목 1개 / 10점")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "세부 설정" }));
    const dialog = screen.getByRole("dialog", { name: "채점표 세부 설정" });
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByLabelText("공식 평가 적용 범위")).toBeInTheDocument();
    expect(within(dialog).getByText("평가 항목")).toBeInTheDocument();
    expect(dialog.querySelector("details")).toBeNull();
    expect(within(dialog).getByRole("textbox", { name: "항목 이름" })).toBeVisible();

    fireEvent.change(within(dialog).getByRole("textbox", { name: "채점표 제목" }), { target: { value: "수정할 평가" } });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "항목 이름" }), { target: { value: "전달력" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "추가" }));
    expect(within(dialog).getByRole("textbox", { name: "2번째 평가 항목 이름" })).toHaveValue("전달력");
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog", { name: "채점표 세부 설정" })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "세부 설정" }));
    const reopenedDialog = screen.getByRole("dialog", { name: "채점표 세부 설정" });
    expect(within(reopenedDialog).getByRole("textbox", { name: "채점표 제목" })).toHaveValue("공식 평가");
    fireEvent.change(within(reopenedDialog).getByRole("textbox", { name: "채점표 제목" }), { target: { value: "최종 평가" } });
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: "저장" }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "rubric-1", title: "최종 평가" }),
    ]);
  });

  it("평가 항목이 없는 채점표는 모달에서 저장할 수 없다", () => {
    render(<ProgramCreateRubricBuilder divisionNames={[]} rubrics={[{ ...rubric, criteria: [] }]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "세부 설정" }));
    const dialog = screen.getByRole("dialog", { name: "채점표 세부 설정" });

    expect(within(dialog).getByRole("button", { name: "저장" })).toBeDisabled();
    expect(within(dialog).getByRole("status")).toHaveTextContent("채점표를 저장하려면 평가 항목을 하나 이상 추가해 주세요.");
  });
});
