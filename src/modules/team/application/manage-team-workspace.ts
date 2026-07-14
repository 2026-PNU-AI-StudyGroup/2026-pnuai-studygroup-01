import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  DiscussionPostWriter,
  MilestoneStatus,
  MilestoneWriter,
  ProgressUpdateWriter,
  TeamListItem,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import {
  assertValidMilestoneDueAt,
  normalizeDiscussionPost,
  normalizeMilestoneTitle,
  normalizeProgressUpdate,
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

export class TeamWorkspaceService {
  constructor(
    private readonly workspaceReader: TeamWorkspaceReader,
    private readonly milestoneWriter: MilestoneWriter,
    private readonly progressWriter: ProgressUpdateWriter,
    private readonly discussionWriter: DiscussionPostWriter,
  ) {}

  async get(actor: CurrentActor, teamId: string, discussionPage = 1, progressPage = 1): Promise<TeamWorkspace> {
    const normalizedDiscussionPage = Number.isSafeInteger(discussionPage) && discussionPage > 0 ? discussionPage : 1;
    const normalizedProgressPage = Number.isSafeInteger(progressPage) && progressPage > 0 ? progressPage : 1;
    const workspace = await this.workspaceReader.findWorkspaceForActor(
      teamId,
      actor,
      normalizedDiscussionPage,
      normalizedProgressPage,
    );
    if (!workspace) {
      throw new TeamNotFoundError();
    }
    return workspace;
  }

  list(actor: CurrentActor): Promise<TeamListItem[]> {
    if (actor.role === "ADMIN") {
      return this.workspaceReader.listAll();
    }
    if (actor.role === "PROFESSOR") {
      return this.workspaceReader.listForProfessor(actor.id);
    }
    return this.workspaceReader.listForStudent(actor.id);
  }

  async createMilestone(
    actor: CurrentActor,
    input: { teamId: string; title: string; dueAt: Date },
  ): Promise<{ id: string }> {
    if (actor.role === "PROFESSOR") throw new TeamNotFoundError();
    assertValidMilestoneDueAt(input.dueAt);
    const milestone = await this.milestoneWriter.createMilestone({
      ...input,
      actor,
      title: normalizeMilestoneTitle(input.title),
    });
    if (!milestone) {
      throw new TeamNotFoundError();
    }
    return milestone;
  }

  async updateMilestoneStatus(
    actor: CurrentActor,
    input: { milestoneId: string; status: MilestoneStatus },
  ): Promise<{ teamId: string }> {
    if (actor.role === "PROFESSOR") throw new MilestoneNotFoundError();
    const result = await this.milestoneWriter.updateMilestoneStatus(
      input.milestoneId,
      input.status,
      actor,
    );
    if (!result) {
      throw new MilestoneNotFoundError();
    }
    return result;
  }

  async createProgressUpdate(
    actor: CurrentActor,
    input: {
      teamId: string;
      content: string;
      risk: string;
      nextAction: string;
    },
  ): Promise<{ id: string }> {
    if (actor.role === "PROFESSOR") throw new TeamNotFoundError();
    const progress = await this.progressWriter.createProgressUpdate({
      teamId: input.teamId,
      actor,
      ...normalizeProgressUpdate(input),
    });
    if (!progress) {
      throw new TeamNotFoundError();
    }
    return progress;
  }

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
