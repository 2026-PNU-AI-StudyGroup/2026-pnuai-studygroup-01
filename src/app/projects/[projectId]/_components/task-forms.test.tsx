import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskCompletionForm, TaskCreateDialog, TaskEditDialog } from "@/app/projects/[projectId]/_components/task-forms";

const { completeTask, createTask, deleteTask, reopenTask, updateTask } = vi.hoisted(() => ({
  completeTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  reopenTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/projects/[projectId]/_actions/team-workspace-actions", () => ({
  completeTaskAction: completeTask,
  createTaskAction: createTask,
  deleteTaskAction: deleteTask,
  reopenTaskAction: reopenTask,
  updateTaskAction: updateTask,
}));

const members = [
  { id: "student-1", name: "정하늘" },
  { id: "student-2", name: "윤서준" },
];

describe("할 일 대화상자", () => {
  beforeEach(() => {
    completeTask.mockReset().mockResolvedValue({ status: "success", message: "할 일을 완료했습니다." });
    createTask.mockReset().mockResolvedValue({ status: "success", message: "할 일을 추가했습니다." });
    deleteTask.mockReset().mockResolvedValue({ status: "success", message: "할 일을 삭제했습니다." });
    reopenTask.mockReset().mockResolvedValue({ status: "success", message: "할 일을 다시 할 일로 돌렸습니다." });
    updateTask.mockReset().mockResolvedValue({ status: "success", message: "할 일을 수정했습니다." });
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
  });

  it("생성 입력은 새 할 일을 누른 뒤에만 표시한다", () => {
    const { container } = render(<TaskCreateDialog teamId="team-1" members={members} />);

    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: "새 할 일" }));
    expect(screen.getByRole("dialog", { name: "새 할 일" })).toHaveAttribute("open");
  });

  it("제목, 기한, 상태와 담당자를 자동 저장 없이 한 번에 제출한다", async () => {
    render(
      <TaskEditDialog
        teamId="team-1"
        taskId="task-1"
        title="사용자 인터뷰"
        dueAt={new Date("2026-08-15T14:59:00.000Z")}
        status="TODO"
        assigneeIds={["student-1"]}
        members={members}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "사용자 인터뷰 수정" }));
    const dialog = screen.getByRole("dialog", { name: "할 일 수정" });
    fireEvent.click(withinDialog(dialog, "combobox", "상태"));
    fireEvent.click(screen.getByRole("option", { name: "진행 중" }));
    fireEvent.click(withinDialog(dialog, "combobox", "담당자"));
    fireEvent.click(screen.getByRole("option", { name: "윤서준" }));

    expect(updateTask).not.toHaveBeenCalled();
    fireEvent.submit(dialog.querySelector("form")!);

    await waitFor(() => expect(updateTask).toHaveBeenCalledTimes(1));
    const submitted = updateTask.mock.calls[0][1] as FormData;
    expect(submitted.get("title")).toBe("사용자 인터뷰");
    expect(submitted.get("dueAt")).toBe("2026-08-15");
    expect(submitted.get("status")).toBe("IN_PROGRESS");
    expect(submitted.getAll("assigneeIds")).toEqual(["student-1", "student-2"]);
  });

  it("진행 중 카드의 체크 버튼으로 할 일을 즉시 완료한다", async () => {
    render(<TaskCompletionForm teamId="team-1" taskId="task-1" title="사용자 인터뷰" status="IN_PROGRESS" />);

    fireEvent.click(screen.getByRole("button", { name: "사용자 인터뷰 완료 처리" }));

    await waitFor(() => expect(completeTask).toHaveBeenCalledTimes(1));
    const submitted = completeTask.mock.calls[0][1] as FormData;
    expect(submitted.get("teamId")).toBe("team-1");
    expect(submitted.get("taskId")).toBe("task-1");
  });

  it("완료 카드에서도 같은 체크 버튼으로 할 일로 되돌린다", async () => {
    render(<TaskCompletionForm teamId="team-1" taskId="task-1" title="사용자 인터뷰" status="DONE" />);

    fireEvent.click(screen.getByRole("button", { name: "사용자 인터뷰 할 일로 되돌리기" }));

    await waitFor(() => expect(reopenTask).toHaveBeenCalledTimes(1));
    const submitted = reopenTask.mock.calls[0][1] as FormData;
    expect(submitted.get("teamId")).toBe("team-1");
    expect(submitted.get("taskId")).toBe("task-1");
    expect(completeTask).not.toHaveBeenCalled();
  });
});

function withinDialog(dialog: HTMLElement, role: "combobox", name: string) {
  const element = Array.from(dialog.querySelectorAll<HTMLElement>(`[role="${role}"],button`)).find((candidate) => candidate.getAttribute("aria-label") === name || candidate.textContent?.trim() === name);
  if (!element) throw new Error(`${name} 컨트롤을 찾을 수 없습니다.`);
  return element;
}
