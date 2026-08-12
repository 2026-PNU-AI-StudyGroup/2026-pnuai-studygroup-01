import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TeamListItem = {
  id: string;
  name: string;
  programName: string;
  topicTitle: string;
  status: "FORMING" | "CONFIRMED" | "CLOSED";
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  reportCount: number;
  submittedReportCount: number;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: Date;
    status: TaskStatus;
    completedAt: Date | null;
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
  professor: {
    id: string;
    name: string;
    profileImage: { updatedAt: Date } | null;
  };
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
    programRecruitmentEndsAt: Date;
    executionStartsAt: Date;
    executionEndsAt: Date;
    submissionStartsAt: Date;
    submissionEndsAt: Date;
  };
  assistants: Array<{
    id: string;
    name: string;
    email: string;
    profileImage: { updatedAt: Date } | null;
  }>;
  members: Array<{
    id: string;
    name: string;
    email: string;
    department: string | null;
    studentNumber: string | null;
    grade: number | null;
    phoneNumber: string | null;
    contactEmail: string | null;
    profileImage: { updatedAt: Date } | null;
    profile: {
      phone: string;
      kakao: string;
      github: string;
      instagram: string;
    } | null;
  }>;
  discussionPosts: Array<{
    id: string;
    authorId: string;
    authorName: string;
    authorRole: "ADMIN" | "PROFESSOR" | "ASSISTANT" | "STUDENT";
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

export interface TaskWriter {
  createTask(input: {
    teamId: string;
    actor: CurrentActor;
    title: string;
    dueAt: Date;
    assigneeIds: string[];
  }): Promise<{ id: string } | null>;
  updateTask(input: {
    id: string;
    title: string;
    dueAt: Date;
    status: TaskStatus;
    assigneeIds: string[];
    actor: CurrentActor;
  }): Promise<{ teamId: string } | null>;
  completeTask(id: string, actor: CurrentActor): Promise<{ teamId: string } | null>;
  reopenTask(id: string, actor: CurrentActor): Promise<{ teamId: string } | null>;
  deleteTask(id: string, actor: CurrentActor): Promise<{ teamId: string } | null>;
}

export interface DiscussionPostWriter {
  createDiscussionPost(input: {
    teamId: string;
    actor: CurrentActor;
    content: string;
  }): Promise<{ id: string } | null>;
}
