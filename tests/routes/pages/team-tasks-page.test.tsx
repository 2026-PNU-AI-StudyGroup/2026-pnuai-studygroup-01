import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TeamTasksPage from "@/app/teams/[teamId]/tasks/page";

const { loadTeamWorkspace } = vi.hoisted(() => ({
  loadTeamWorkspace: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_lib/team-workspace-data", () => ({
  loadTeamWorkspace,
}));

vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({
  getLocalizedMetadata: vi.fn(),
}));

vi.mock("@/app/teams/[teamId]/_components/task-forms", () => ({
  TaskCreateDialog: () => <button data-testid="new-task-dialog">새 할 일</button>,
  TaskEditDialog: ({ status, assigneeIds }: { status: string; assigneeIds: string[] }) => (
    <button data-testid="task-edit-dialog">수정 {status}:{assigneeIds.join(",")}</button>
  ),
}));

const workspace = {
  id: "team-1",
  topicId: "topic-1",
  name: "모두의 길",
  topicTitle: "실내 길찾기",
  status: "CONFIRMED" as const,
  memberCount: 1,
  taskCount: 1,
  completedTaskCount: 0,
  reportCount: 0,
  submittedReportCount: 0,
  tasks: [{
    id: "task-1",
    title: "사용자 인터뷰 완료",
    dueAt: new Date("2026-09-01T00:00:00Z"),
    status: "IN_PROGRESS" as const,
    assignees: [{ id: "student-1", name: "정하늘" }],
  }],
  professorName: "김도윤",
  advisorEnabled: true,
  canClose: false,
  access: {
    isPrimaryAdvisor: false,
    isAssistant: false,
    isTeamMember: true,
    canSupervise: false,
    canContribute: true,
  },
  schedule: {
    recruitmentStartsAt: new Date("2026-01-01T00:00:00Z"),
    programRecruitmentEndsAt: new Date("2026-02-01T00:00:00Z"),
    executionStartsAt: new Date("2026-03-01T00:00:00Z"),
    executionEndsAt: new Date("2026-10-01T00:00:00Z"),
    submissionStartsAt: new Date("2026-09-01T00:00:00Z"),
    submissionEndsAt: new Date("2026-12-01T00:00:00Z"),
  },
  members: [{ id: "student-1", name: "정하늘", email: "student@pusan.ac.kr" }],
  discussionPosts: [],
  discussionPage: 1,
  discussionTotalPages: 1,
  discussionTotal: 0,
};

describe("TeamTasksPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T00:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("기여자도 정적 상태와 담당자를 확인하고 별도 편집 컨트롤을 사용한다", async () => {
    loadTeamWorkspace.mockResolvedValue({ workspace });

    render(await TeamTasksPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.getByTestId("task-edit-dialog")).toHaveTextContent("IN_PROGRESS:student-1");
    expect(screen.getByTestId("new-task-dialog")).toBeInTheDocument();
    expect(screen.getAllByText("진행 중").length).toBeGreaterThan(0);
    expect(screen.getByText("정하늘")).toBeInTheDocument();
  });

  it("읽기 전용 사용자는 정적 상태와 담당자를 확인한다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      workspace: {
        ...workspace,
        access: { ...workspace.access, isTeamMember: false, canContribute: false },
      },
    });

    render(await TeamTasksPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.queryByTestId("task-edit-dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("진행 중").length).toBeGreaterThan(0);
    expect(screen.getByText("정하늘")).toBeInTheDocument();
  });

  it("기한이 지난 진행 중 항목을 먼저 보여주고 완료 항목은 접힌 후순위 영역에 둔다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      workspace: {
        ...workspace,
        taskCount: 4,
        completedTaskCount: 1,
        tasks: [
          {
            id: "done",
            title: "완료한 조사",
            dueAt: new Date("2026-07-20T00:00:00.000Z"),
            status: "DONE" as const,
            assignees: [{ id: "student-1", name: "정하늘" }],
          },
          {
            id: "future-progress",
            title: "프로토타입 검증",
            dueAt: new Date("2026-08-20T00:00:00.000Z"),
            status: "IN_PROGRESS" as const,
            assignees: [{ id: "student-1", name: "정하늘" }],
          },
          {
            id: "future-todo",
            title: "지도 데이터 검증",
            dueAt: new Date("2026-08-10T00:00:00.000Z"),
            status: "TODO" as const,
            assignees: [],
          },
          {
            id: "overdue-todo",
            title: "지연된 인터뷰 정리",
            dueAt: new Date("2026-08-01T00:00:00.000Z"),
            status: "TODO" as const,
            assignees: [],
          },
        ],
      },
    });

    render(await TeamTasksPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    const activeSection = screen.getByRole("heading", { name: "남은 할 일" }).closest("section");
    expect(activeSection).not.toBeNull();
    expect(within(activeSection!).getAllByRole("heading", { level: 3 }).map(({ textContent }) => textContent)).toEqual([
      "지연된 인터뷰 정리",
      "프로토타입 검증",
      "지도 데이터 검증",
    ]);
    expect(screen.getAllByText("기한 초과")).toHaveLength(1);
    expect(screen.getByText(/완료한 일/).closest("details")).not.toHaveAttribute("open");
  });

  it("종료된 프로젝트에서는 생성과 편집 컨트롤을 숨긴다", async () => {
    loadTeamWorkspace.mockResolvedValue({
      workspace: {
        ...workspace,
        status: "CLOSED" as const,
      },
    });

    render(await TeamTasksPage({ params: Promise.resolve({ teamId: "team-1" }) }));

    expect(screen.queryByTestId("new-task-dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("task-edit-dialog")).not.toBeInTheDocument();
    expect(screen.getByText("정하늘")).toBeInTheDocument();
  });
});
