import { describe, expect, it, vi } from "vitest";

import {
  TeamDiscussionService,
  TeamTaskService,
  TeamNotFoundError,
  TeamWorkspaceQueryService,
} from "@/modules/team/application/manage-team-workspace";
import type {
  DiscussionPostWriter,
  TaskWriter,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import { InvalidTaskError } from "@/modules/team/domain/team-workspace-policy";

function dependencies() {
  const reader: TeamWorkspaceReader = {
    findWorkspaceForActor: vi.fn(),
    listForStudent: vi.fn(),
    listForProfessor: vi.fn(),
    listAll: vi.fn(),
    listForActor: vi.fn(),
    listPageForActor: vi.fn(),
  };
  const tasks: TaskWriter = {
    createTask: vi.fn(async () => ({ id: "task-1" })),
    completeTask: vi.fn(),
    reopenTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  };
  const discussion: DiscussionPostWriter = {
    createDiscussionPost: vi.fn(async () => ({ id: "post-1" })),
  };
  return { reader, tasks, discussion };
}

describe("팀 워크스페이스 기록", () => {
  it("대화 이력 페이지를 정규화해 조회 저장소에 전달한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.reader.findWorkspaceForActor).mockResolvedValue({} as never);
    const service = new TeamWorkspaceQueryService(deps.reader);
    await service.get({ id: "student-1", role: "STUDENT" }, "team-1", 3);
    expect(deps.reader.findWorkspaceForActor).toHaveBeenCalledWith("team-1", { id: "student-1", role: "STUDENT" }, 3);
  });

  it("팀원이 정규화된 할 일을 생성한다", async () => {
    const deps = dependencies();
    const service = new TeamTaskService(deps.tasks);
    const dueAt = new Date("2026-05-01T00:00:00Z");

    await service.createTask(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", title: "  중간 발표  ", dueAt, assigneeIds: ["student-2", "student-3", "student-2"] },
    );

    expect(deps.tasks.createTask).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      assigneeIds: ["student-2", "student-3"],
      title: "중간 발표",
      dueAt,
    });
  });

  it("기여 권한이 없는 사용자의 할 일 요청은 저장소 판정으로 거절한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.createTask).mockResolvedValue(null);
    const service = new TeamTaskService(deps.tasks);
    const professor = { id: "professor-1", role: "PROFESSOR" as const };

    await expect(service.createTask(professor, { teamId: "team-1", title: "교수 작성", dueAt: new Date("2026-05-01T00:00:00Z") })).rejects.toBeInstanceOf(TeamNotFoundError);
    expect(deps.tasks.createTask).toHaveBeenCalledOnce();
  });

  it("유효하지 않은 마감일을 영속화 전에 거부한다", async () => {
    const deps = dependencies();
    const service = new TeamTaskService(deps.tasks);

    await expect(
      service.createTask(
        { id: "student-1", role: "STUDENT" },
        {
          teamId: "team-1",
          title: "중간 발표",
          dueAt: new Date("invalid"),
        },
      ),
    ).rejects.toBeInstanceOf(InvalidTaskError);
    expect(deps.tasks.createTask).not.toHaveBeenCalled();
  });

  it("할 일 내용과 상태, 담당자를 정규화해 한 번에 수정한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.updateTask).mockResolvedValue({ teamId: "team-1" });
    const service = new TeamTaskService(deps.tasks);
    const dueAt = new Date("2026-06-01T14:59:00.000Z");

    await expect(service.updateTask(
      { id: "student-1", role: "STUDENT" },
      { taskId: "task-1", title: "  사용자 인터뷰 정리  ", dueAt, status: "IN_PROGRESS", assigneeIds: ["student-2", "student-2"] },
    )).resolves.toEqual({ teamId: "team-1" });

    expect(deps.tasks.updateTask).toHaveBeenCalledWith({
      id: "task-1",
      actor: { id: "student-1", role: "STUDENT" },
      title: "사용자 인터뷰 정리",
      dueAt,
      status: "IN_PROGRESS",
      assigneeIds: ["student-2"],
    });
  });

  it("권한이 확인된 진행 중 할 일을 즉시 완료한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.completeTask).mockResolvedValue({ teamId: "team-1" });
    const service = new TeamTaskService(deps.tasks);

    await expect(service.completeTask(
      { id: "student-1", role: "STUDENT" },
      "task-1",
    )).resolves.toEqual({ teamId: "team-1" });
    expect(deps.tasks.completeTask).toHaveBeenCalledWith(
      "task-1",
      { id: "student-1", role: "STUDENT" },
    );
  });

  it("완료한 할 일을 같은 전환 경로로 할 일로 되돌린다", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.reopenTask).mockResolvedValue({ teamId: "team-1" });
    const service = new TeamTaskService(deps.tasks);

    await expect(service.reopenTask(
      { id: "student-1", role: "STUDENT" },
      "task-1",
    )).resolves.toEqual({ teamId: "team-1" });
    expect(deps.tasks.reopenTask).toHaveBeenCalledWith(
      "task-1",
      { id: "student-1", role: "STUDENT" },
    );
  });

  it("권한이 확인된 할 일만 삭제한다", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.deleteTask).mockResolvedValue({ teamId: "team-1" });
    const service = new TeamTaskService(deps.tasks);

    await expect(service.deleteTask(
      { id: "student-1", role: "STUDENT" },
      "task-1",
    )).resolves.toEqual({ teamId: "team-1" });
    expect(deps.tasks.deleteTask).toHaveBeenCalledWith(
      "task-1",
      { id: "student-1", role: "STUDENT" },
    );
  });

  it("팀 토론 내용을 정규화해 작성자와 함께 전달한다", async () => {
    const deps = dependencies();
    const service = new TeamDiscussionService(deps.discussion);
    await service.createDiscussionPost(
      { id: "student-1", role: "STUDENT" },
      { teamId: "team-1", content: "  회의는 금요일입니다.  " },
    );
    expect(deps.discussion.createDiscussionPost).toHaveBeenCalledWith({
      teamId: "team-1",
      actor: { id: "student-1", role: "STUDENT" },
      content: "회의는 금요일입니다.",
    });
  });
});
