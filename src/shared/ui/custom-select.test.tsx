import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomMultiSelect, CustomSelect } from "@/shared/ui/custom-select";

describe("CustomMultiSelect", () => {
  it("이름 첫 글자 타일 없이 체크박스와 텍스트만 표시한다", async () => {
    render(
      <CustomMultiSelect
        name="members"
        ariaLabel="팀원"
        options={[{ value: "student-1", label: "김학생", description: "학생" }]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "팀원" }));
    await screen.findByRole("option", { name: /김학생/ });
    expect(screen.getByRole("option", { name: /김학생/ })).toHaveTextContent("학생");
  });
});

describe("CustomSelect", () => {
  it("선택한 값을 폼 필드에 반영한다", () => {
    const { container } = render(
      <CustomSelect
        name="status"
        ariaLabel="상태"
        defaultValue="TODO"
        options={[
          { value: "TODO", label: "할 일" },
          { value: "DONE", label: "완료" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));
    fireEvent.click(screen.getByRole("option", { name: "완료" }));

    expect(container.querySelector<HTMLInputElement>('input[name="status"]')?.value).toBe("DONE");
    expect(screen.getByRole("combobox", { name: "상태" })).toHaveAttribute("aria-expanded", "false");
  });

  it("별도 FormData 값이 필요한 조합에서는 내부 선택값을 제출하지 않는다", () => {
    const { container } = render(
      <CustomSelect
        ariaLabel="분류"
        defaultValue="CAPSTONE"
        options={[{ value: "CAPSTONE", label: "캡스톤" }]}
      />,
    );

    expect(container.querySelector("input[type='hidden']")).not.toBeInTheDocument();
    expect(container.querySelector("[data-validation-proxy='custom-select']")).toBeInTheDocument();
  });

  it("도움말 연결을 트리거에 유지한다", () => {
    render(
      <>
        <p id="grade-help">현재 재학 중인 학년을 선택합니다.</p>
        <CustomSelect
          name="grade"
          ariaLabel="학년"
          ariaDescribedBy="grade-help"
          options={[{ value: "1", label: "1학년" }]}
        />
      </>,
    );

    expect(screen.getByRole("combobox", { name: "학년" })).toHaveAttribute("aria-describedby", "grade-help");
  });

  it("현재 선택값은 요청한 목록에서만 다시 표시하지 않는다", () => {
    render(
      <CustomSelect
        name="category"
        ariaLabel="프로그램 분류"
        defaultValue="CAPSTONE"
        hideSelectedOption
        options={[
          { value: "CAPSTONE", label: "캡스톤" },
          { value: "HACKATHON", label: "해커톤" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "프로그램 분류" }));
    expect(screen.queryByRole("option", { name: "캡스톤" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "해커톤" })).toBeInTheDocument();
  });

  it("제어형 값은 부모가 갱신할 때만 바뀌고 같은 값 재선택은 알리지 않는다", () => {
    const onValueChange = vi.fn();
    const options = [
      { value: "TODO", label: "할 일" },
      { value: "DONE", label: "완료" },
    ];
    const { container, rerender } = render(
      <CustomSelect name="status" ariaLabel="상태" value="TODO" options={options} onValueChange={onValueChange} />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));
    fireEvent.click(screen.getByRole("option", { name: "할 일" }));
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));
    fireEvent.click(screen.getByRole("option", { name: "완료" }));
    expect(onValueChange).toHaveBeenCalledWith("DONE");
    expect(container.querySelector<HTMLInputElement>('input[name="status"]')).toHaveValue("TODO");

    rerender(<CustomSelect name="status" ariaLabel="상태" value="DONE" options={options} onValueChange={onValueChange} />);
    expect(container.querySelector<HTMLInputElement>('input[name="status"]')).toHaveValue("DONE");
  });

  it("목록을 방향키로 이동하고 Enter로 선택하며 Escape로 트리거에 복귀한다", async () => {
    const { container } = render(
      <CustomSelect
        name="status"
        ariaLabel="상태"
        defaultValue="TODO"
        options={[
          { value: "TODO", label: "할 일" },
          { value: "IN_PROGRESS", label: "진행 중" },
          { value: "DONE", label: "완료" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "상태" });

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const todo = await screen.findByRole("option", { name: "할 일" });
    await waitFor(() => expect(todo).toHaveFocus());
    expect(todo).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("option", { name: "진행 중" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("option", { name: "완료" })).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(todo, { key: "End" });
    const done = screen.getByRole("option", { name: "완료" });
    expect(done).toHaveFocus();
    expect(todo).toHaveAttribute("tabindex", "-1");
    expect(done).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(done, { key: "Enter" });

    expect(container.querySelector<HTMLInputElement>('input[name="status"]')).toHaveValue("DONE");
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    await waitFor(() => expect(screen.getByRole("option", { name: "완료" })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole("option", { name: "완료" }), { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("일반 화면은 body, native dialog 내부는 해당 dialog에 목록을 포털한다", async () => {
    const options = [{ value: "TODO", label: "할 일" }];
    const { unmount } = render(<CustomSelect name="status" ariaLabel="상태" options={options} />);

    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));
    expect(screen.getByRole("listbox").parentElement).toBe(document.body);
    unmount();

    const { container } = render(
      <>
        <button type="button">대화상자 밖</button>
        <dialog open>
          <button type="button">대화상자 이전</button>
          <CustomSelect name="status" ariaLabel="상태" options={options} />
          <button type="button">대화상자 다음</button>
        </dialog>
      </>,
    );
    const dialog = container.querySelector("dialog")!;
    fireEvent.click(screen.getByRole("combobox", { name: "상태" }));

    const listbox = screen.getByRole("listbox");
    expect(listbox.parentElement).toBe(dialog);
    expect(dialog).toContainElement(listbox);
    const option = screen.getByRole("option", { name: "할 일" });
    await waitFor(() => expect(option).toHaveFocus());
    fireEvent.keyDown(option, { key: "Tab" });
    await waitFor(() => expect(screen.getByRole("button", { name: "대화상자 다음" })).toHaveFocus());
    expect(screen.getByRole("button", { name: "대화상자 밖" })).not.toHaveFocus();
  });

  it("포털 옵션에서 Tab과 Shift+Tab을 누르면 트리거 기준 실제 다음·이전 요소로 이동한다", async () => {
    render(
      <>
        <button type="button">이전 동작</button>
        <CustomSelect
          name="status"
          ariaLabel="상태"
          options={[
            { value: "TODO", label: "할 일" },
            { value: "DONE", label: "완료" },
          ]}
        />
        <button type="button" disabled>비활성 동작</button>
        <button type="button">다음 동작</button>
      </>,
    );
    const trigger = screen.getByRole("combobox", { name: "상태" });

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const firstOption = await screen.findByRole("option", { name: "할 일" });
    await waitFor(() => expect(firstOption).toHaveFocus());
    fireEvent.keyDown(firstOption, { key: "Tab" });
    await waitFor(() => expect(screen.getByRole("button", { name: "다음 동작" })).toHaveFocus());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const reopenedOption = await screen.findByRole("option", { name: "할 일" });
    await waitFor(() => expect(reopenedOption).toHaveFocus());
    fireEvent.keyDown(reopenedOption, { key: "Tab", shiftKey: true });
    await waitFor(() => expect(screen.getByRole("button", { name: "이전 동작" })).toHaveFocus());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("열린 중 옵션 수가 줄어도 남은 옵션만 roving tab stop과 방향키 대상이 된다", async () => {
    const { rerender } = render(
      <CustomSelect
        name="status"
        ariaLabel="상태"
        options={[
          { value: "TODO", label: "할 일" },
          { value: "IN_PROGRESS", label: "진행 중" },
          { value: "DONE", label: "완료" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "상태" });
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    await waitFor(() => expect(screen.getByRole("option", { name: "완료" })).toHaveFocus());

    rerender(
      <CustomSelect
        name="status"
        ariaLabel="상태"
        options={[{ value: "TODO", label: "할 일" }]}
      />,
    );

    const onlyOption = screen.getByRole("option", { name: "할 일" });
    await waitFor(() => expect(onlyOption).toHaveFocus());
    expect(onlyOption).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(onlyOption, { key: "ArrowDown" });
    expect(onlyOption).toHaveFocus();
  });

  it("검색형 목록은 이름과 설명으로 선택지를 좁힌다", async () => {
    render(
      <CustomSelect
        name="professorId"
        ariaLabel="검토 요청 교수"
        searchable
        options={[
          { value: "professor-1", label: "김교수", description: "kim@pusan.ac.kr" },
          { value: "professor-2", label: "박교수", description: "park@pusan.ac.kr" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "검토 요청 교수" }));
    const search = screen.getByRole("searchbox", { name: "검토 요청 교수 검색" });
    await waitFor(() => expect(search).toHaveFocus());
    fireEvent.change(search, { target: { value: "park@" } });

    expect(screen.queryByRole("option", { name: /김교수/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /박교수/ })).toBeInTheDocument();
  });

  it("다른 필수 입력이 있어도 첫 커스텀 필드가 제출을 막고 오류 포커스를 유지한다", async () => {
    const submit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    const { container } = render(
      <form onSubmit={submit}>
        <CustomSelect
          name="status"
          ariaLabel="상태"
          required
          options={[
            { value: "TODO", label: "할 일" },
            { value: "DONE", label: "완료" },
          ]}
        />
        <input aria-label="주제명" required />
        <button type="submit">저장</button>
      </form>,
    );

    const form = container.querySelector("form")!;
    const trigger = screen.getByRole("combobox", { name: "상태" });
    const validationProxy = container.querySelector<HTMLInputElement>("[data-validation-proxy='custom-select']");

    expect(trigger).toHaveAttribute("aria-required", "true");
    expect(trigger).not.toHaveAttribute("aria-invalid");
    expect(validationProxy).toBeRequired();
    expect(validationProxy).not.toHaveAttribute("name");
    expect(validationProxy).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(submit).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "완료" }));
    fireEvent.change(screen.getByRole("textbox", { name: "주제명" }), { target: { value: "새 주제" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(trigger).not.toHaveAttribute("aria-invalid");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(new FormData(form).getAll("status")).toEqual(["DONE"]);
  });
});

describe("CustomMultiSelect", () => {
  it("여러 담당자를 추가하고 다시 해제한다", () => {
    const { container } = render(
      <CustomMultiSelect
        name="assigneeIds"
        options={[
          { value: "student-1", label: "정하늘" },
          { value: "student-2", label: "윤서준" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "담당자를 선택하세요" }));
    fireEvent.click(screen.getByRole("option", { name: "정하늘" }));
    fireEvent.click(screen.getByRole("option", { name: "윤서준" }));

    expect(
      [...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value),
    ).toEqual(["student-1", "student-2"]);

    fireEvent.click(screen.getByRole("option", { name: "정하늘" }));
    expect(
      [...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value),
    ).toEqual(["student-2"]);
  });

  it("제어형 선택 목록은 변경 후보를 알리고 부모 값이 바뀔 때 반영한다", () => {
    const onValuesChange = vi.fn();
    const options = [
      { value: "student-1", label: "정하늘" },
      { value: "student-2", label: "윤서준" },
    ];
    const { container, rerender } = render(
      <CustomMultiSelect name="assigneeIds" values={["student-1"]} options={options} onValuesChange={onValuesChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "정하늘" }));
    fireEvent.click(screen.getByRole("option", { name: "윤서준" }));
    expect(onValuesChange).toHaveBeenCalledWith(["student-1", "student-2"]);
    expect([...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value)).toEqual(["student-1"]);

    rerender(<CustomMultiSelect name="assigneeIds" values={["student-1", "student-2"]} options={options} onValuesChange={onValuesChange} />);
    expect([...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value)).toEqual(["student-1", "student-2"]);
  });

  it("다중 선택 목록도 방향키 탐색과 Escape 포커스 복귀를 지원한다", async () => {
    render(
      <CustomMultiSelect
        name="assigneeIds"
        options={[
          { value: "student-1", label: "정하늘" },
          { value: "student-2", label: "윤서준" },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "담당자를 선택하세요" });

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const first = await screen.findByRole("option", { name: "정하늘" });
    await waitFor(() => expect(first).toHaveFocus());
    expect(first).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("option", { name: "윤서준" })).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "윤서준" })).toHaveFocus();
    expect(screen.getByRole("option", { name: "윤서준" })).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(screen.getByRole("option", { name: "윤서준" }), { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("다중 선택 포털도 Tab 시 트리거 다음 실제 탭 요소로 이동한다", async () => {
    render(
      <>
        <CustomMultiSelect
          name="assigneeIds"
          options={[
            { value: "student-1", label: "정하늘" },
            { value: "student-2", label: "윤서준" },
          ]}
        />
        <button type="button">저장</button>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "담당자를 선택하세요" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const first = await screen.findByRole("option", { name: "정하늘" });
    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.keyDown(first, { key: "Tab" });

    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).toHaveFocus());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("다중 선택도 검색 결과 안에서 선택한다", async () => {
    const { container } = render(
      <CustomMultiSelect
        name="assigneeIds"
        searchable
        options={[
          { value: "student-1", label: "정하늘" },
          { value: "student-2", label: "윤서준" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "담당자를 선택하세요" }));
    const search = screen.getByRole("searchbox", { name: "담당자 검색" });
    fireEvent.change(search, { target: { value: "윤서" } });
    fireEvent.click(screen.getByRole("option", { name: "윤서준" }));

    expect([...container.querySelectorAll<HTMLInputElement>('input[name="assigneeIds"]')].map(({ value }) => value)).toEqual(["student-2"]);
  });
});
