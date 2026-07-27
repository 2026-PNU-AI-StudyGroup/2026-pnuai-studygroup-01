import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  DiscussionPostWriter,
  MilestoneStatus,
  MilestoneWriter,
  TeamListItem,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import {
  assertValidMilestoneDueAt,
  normalizeDiscussionPost,
  normalizeMilestoneTitle,
} from "@/modules/team/domain/team-workspace-policy";

export class TeamNotFoundError extends Error {
  constructor() {
    super("팀을 찾을 수 없습니다.");
    this.name = "TeamNotFoundError";
  }
}

export class MilestoneNotFoundError extends Error {
  constructor() {
    super("마일스톤을 찾을 수 없습니다.");
    this.name = "MilestoneNotFoundError";
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
}

export class TeamMilestoneService {
  constructor(private readonly milestoneWriter: MilestoneWriter) {}

  async createMilestone(
    actor: CurrentActor,
    input: { teamId: string; title: string; dueAt: Date; assigneeIds?: string[] },
  ): Promise<{ id: string }> {
    assertValidMilestoneDueAt(input.dueAt);
    const milestone = await this.milestoneWriter.createMilestone({
      ...input,
      actor,
      title: normalizeMilestoneTitle(input.title),
      assigneeIds: [...new Set(input.assigneeIds ?? [])],
    });
    if (!milestone) {
      throw new TeamNotFoundError();
    }
    return milestone;
  }

  async updateMilestoneStatus(
    actor: CurrentActor,
    input: { milestoneId: string; status: MilestoneStatus; assigneeIds?: string[] },
  ): Promise<{ teamId: string }> {
    const result = await this.milestoneWriter.updateMilestoneStatus(
      input.milestoneId,
      input.status,
      [...new Set(input.assigneeIds ?? [])],
      actor,
    );
    if (!result) {
      throw new MilestoneNotFoundError();
    }
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
