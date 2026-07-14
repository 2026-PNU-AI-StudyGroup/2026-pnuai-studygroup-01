import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type MilestoneStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TeamListItem = {
  id: string;
  name: string;
  topicTitle: string;
  status: "FORMING" | "CONFIRMED" | "CLOSED";
  memberCount: number;
  milestoneCount: number;
  completedMilestoneCount: number;
};

export type TeamWorkspace = TeamListItem & {
  professorName: string;
  canClose: boolean;
  members: Array<{ id: string; name: string; email: string }>;
  milestones: Array<{
    id: string;
    title: string;
    dueAt: Date;
    status: MilestoneStatus;
  }>;
  progressUpdates: Array<{
    id: string;
    authorName: string;
    content: string;
    risk: string;
    nextAction: string;
    createdAt: Date;
  }>;
  progressPage: number;
  progressTotalPages: number;
  progressTotal: number;
  discussionPosts: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
  }>;
  discussionPage: number;
  discussionTotalPages: number;
  discussionTotal: number;
};

export interface TeamWorkspaceReader {
  findWorkspaceForActor(
    teamId: string,
    actor: CurrentActor,
    discussionPage?: number,
    progressPage?: number,
  ): Promise<TeamWorkspace | null>;
  listForStudent(studentId: string): Promise<TeamListItem[]>;
  listForProfessor(professorId: string): Promise<TeamListItem[]>;
  listAll(): Promise<TeamListItem[]>;
}

export interface MilestoneWriter {
  createMilestone(input: {
    teamId: string;
    actor: CurrentActor;
    title: string;
    dueAt: Date;
  }): Promise<{ id: string } | null>;
  updateMilestoneStatus(
    id: string,
    status: MilestoneStatus,
    actor: CurrentActor,
  ): Promise<{ teamId: string } | null>;
}

export interface ProgressUpdateWriter {
  createProgressUpdate(input: {
    teamId: string;
    actor: CurrentActor;
    content: string;
    risk: string;
    nextAction: string;
  }): Promise<{ id: string } | null>;
}

export interface DiscussionPostWriter {
  createDiscussionPost(input: {
    teamId: string;
    actor: CurrentActor;
    content: string;
  }): Promise<{ id: string } | null>;
}
