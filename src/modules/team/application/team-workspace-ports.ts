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
  reportCount: number;
  submittedReportCount: number;
  milestones: Array<{
    id: string;
    title: string;
    dueAt: Date;
    status: MilestoneStatus;
    assignees: Array<{ id: string; name: string }>;
  }>;
};

export type TeamListPage = {
  items: TeamListItem[];
  page: number;
  totalPages: number;
  total: number;
  counts: { all: number; active: number; completed: number };
};

export type TeamWorkspace = TeamListItem & {
  topicId: string;
  professorName: string;
  advisorEnabled: boolean;
  access: {
    isPrimaryAdvisor: boolean;
    isAssistant: boolean;
    isTeamMember: boolean;
    canSupervise: boolean;
    canContribute: boolean;
  };
  canClose: boolean;
  schedule: {
    recruitmentStartsAt: Date;
    recruitmentEndsAt: Date;
    executionStartsAt: Date;
    executionEndsAt: Date;
    submissionStartsAt: Date;
    submissionEndsAt: Date;
  };
  members: Array<{ id: string; name: string; email: string }>;
  discussionPosts: Array<{
    id: string;
    authorId: string;
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
  ): Promise<TeamWorkspace | null>;
  listForStudent(studentId: string): Promise<TeamListItem[]>;
  listForProfessor(professorId: string): Promise<TeamListItem[]>;
  listAll(): Promise<TeamListItem[]>;
  listForActor(actor: CurrentActor): Promise<TeamListItem[]>;
  listPageForActor(
    actor: CurrentActor,
    page: number,
    pageSize: number,
    status?: "ACTIVE" | "COMPLETED",
  ): Promise<TeamListPage>;
}

export interface MilestoneWriter {
  createMilestone(input: {
    teamId: string;
    actor: CurrentActor;
    title: string;
    dueAt: Date;
    assigneeIds: string[];
  }): Promise<{ id: string } | null>;
  updateMilestoneStatus(
    id: string,
    status: MilestoneStatus,
    assigneeIds: string[],
    actor: CurrentActor,
  ): Promise<{ teamId: string } | null>;
}

export interface DiscussionPostWriter {
  createDiscussionPost(input: {
    teamId: string;
    actor: CurrentActor;
    content: string;
  }): Promise<{ id: string } | null>;
}
