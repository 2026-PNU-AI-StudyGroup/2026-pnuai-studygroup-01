import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  DiscussionPostWriter,
  TaskStatus,
  TaskWriter,
  TeamListItem,
  TeamListPage,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import {
  assertValidTaskDueAt,
  normalizeDiscussionPost,
  normalizeTaskTitle,
} from "@/modules/team/domain/team-workspace-policy";

export class TeamNotFoundError extends Error {
  constructor() {
    super("팀을 찾을 수 없습니다.");
    this.name = "TeamNotFoundError";
  }
}

export class TaskNotFoundError extends Error {
  constructor() {
    super("할 일을 찾을 수 없습니다.");
    this.name = "TaskNotFoundError";
  }
}

export class TeamWorkspaceQueryService {
  constructor(private readonly workspaceReader: TeamWorkspaceReader) {}

  async get(actor: CurrentActor, teamId: string, discussionPage = 1): Promise<TeamWorkspace> {
    const normalizedDiscussionPage = Number.isSafeInteger(discussionPage) && discussionPage > 0 ? discussionPage : 1;
    const workspace = await this.workspaceReader.findWorkspaceForActor(
      teamId,
      actor,
      normalizedDiscussionPage,
    );
    if (!workspace) {
      throw new TeamNotFoundError();
    }
    return workspace;
  }

  list(actor: CurrentActor): Promise<TeamListItem[]> {
    return this.workspaceReader.listForActor(actor);
  }

  listPage(actor: CurrentActor, requestedPage = 1, status?: "ACTIVE" | "COMPLETED"): Promise<TeamListPage> {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    return this.workspaceReader.listPageForActor(actor, page, 20, status);
  }
}

export class TeamTaskService {
  constructor(private readonly taskWriter: TaskWriter) {}

  async createTask(
    actor: CurrentActor,
    input: { teamId: string; title: string; dueAt: Date; assigneeIds?: string[] },
  ): Promise<{ id: string }> {
    assertValidTaskDueAt(input.dueAt);
    const task = await this.taskWriter.createTask({
      ...input,
      actor,
      title: normalizeTaskTitle(input.title),
      assigneeIds: [...new Set(input.assigneeIds ?? [])],
    });
    if (!task) {
      throw new TeamNotFoundError();
    }
    return task;
  }

  async updateTask(
    actor: CurrentActor,
    input: { taskId: string; title: string; dueAt: Date; status: TaskStatus; assigneeIds?: string[] },
  ): Promise<{ teamId: string }> {
    assertValidTaskDueAt(input.dueAt);
    const result = await this.taskWriter.updateTask({
      id: input.taskId,
      actor,
      title: normalizeTaskTitle(input.title),
      dueAt: input.dueAt,
      status: input.status,
      assigneeIds: [...new Set(input.assigneeIds ?? [])],
    });
    if (!result) throw new TaskNotFoundError();
    return result;
  }

  async deleteTask(actor: CurrentActor, taskId: string): Promise<{ teamId: string }> {
    const result = await this.taskWriter.deleteTask(taskId, actor);
    if (!result) throw new TaskNotFoundError();
    return result;
  }
}

export class TeamDiscussionService {
  constructor(private readonly discussionWriter: DiscussionPostWriter) {}

  async createDiscussionPost(
    actor: CurrentActor,
    input: { teamId: string; content: string },
  ): Promise<{ id: string }> {
    const post = await this.discussionWriter.createDiscussionPost({
      teamId: input.teamId,
      actor,
      content: normalizeDiscussionPost(input.content),
    });
    if (!post) throw new TeamNotFoundError();
    return post;
  }
}
