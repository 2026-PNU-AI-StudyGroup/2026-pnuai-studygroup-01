import type { CurrentActor, CurrentUser } from "@/modules/identity/domain/current-actor";
import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";
import { assertValidTopicDetails } from "@/modules/topic/domain/topic-policy";
import { isProjectRegistrationOpen } from "@/modules/project-program/domain/project-program-policy";
import type { TopicApprovalStatus } from "@/modules/topic-approval/domain/topic-approval-status";

export { topicApprovalStatuses, type TopicApprovalStatus } from "@/modules/topic-approval/domain/topic-approval-status";

export type TopicApprovalRoute = "PROFESSOR" | "ADMIN";
export type TopicApprovalListFilter = {
  programId?: string;
  status?: TopicApprovalStatus;
  programEndsAfter?: Date;
};
export type PendingApprovalCountByProgram = { programId: string; count: number };
export type TopicApprovalViewer = CurrentActor | CurrentUser;
export type TopicApprovalRequestSummary = {
  id: string;
  topicId: string;
  topicTitle: string;
  programId: string;
  programName: string;
  programCategory: string;
  requesterId: string;
  requesterName: string;
  route: TopicApprovalRoute;
  requestedProfessorId: string | null;
  requestedProfessorName: string | null;
  status: TopicApprovalStatus;
  reviewComment: string;
  createdAt: Date;
  decidedAt: Date | null;
  description: string;
  projectTeam: {
    id: string;
    name: string;
    confirmedAt: Date | null;
    createdAt: Date;
    members: Array<{
      id: string;
      name: string;
      role: "LEADER" | "MEMBER";
      contact: null | {
        email: string;
        contactEmail: string | null;
        phone: string | null;
        kakao: string | null;
        github: string | null;
        instagram: string | null;
      };
    }>;
  } | null;
};

export type TopicApprovalRequestPage = {
  items: TopicApprovalRequestSummary[];
  page: number;
  totalPages: number;
  total: number;
};

export interface TopicApprovalRepository {
  listProfessors(): Promise<Array<{ id: string; name: string; email: string }>>;
  create(input: TopicDraft & {
    route: TopicApprovalRoute;
    requestedProfessorId: string | null;
    sourceStudentTeamId: string;
    projectRepresentativeId: string;
    projectTeamName: string;
    requestedAt: Date;
  }): Promise<string | null>;
  listVisiblePage(
    actor: TopicApprovalViewer,
    page: number,
    pageSize: number,
    filter?: TopicApprovalListFilter,
  ): Promise<TopicApprovalRequestPage>;
  listAdminPendingCountsByProgram(): Promise<PendingApprovalCountByProgram[]>;
  decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "UNAVAILABLE">;
  withdraw(input: { projectId: string; requesterId: string; withdrawnAt: Date }): Promise<"WITHDRAWN" | "NOT_FOUND" | "FORBIDDEN">;
}

export class TopicApprovalOperationError extends Error {}

export class TopicApprovalService {
  constructor(
    private readonly repository: TopicApprovalRepository,
    private readonly programs: Pick<ProjectProgramRepository, "findOpen">,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listProfessors() { return this.repository.listProfessors(); }

  async createStudentRegistration(
    actor: CurrentUser,
    input: Omit<TopicDraft, "authorId"> & {
      route: TopicApprovalRoute;
      requestedProfessorId?: string;
      sourceStudentTeamId?: string;
      projectRepresentativeId?: string;
      projectTeamName?: string;
    },
  ) {
    if (actor.role !== "STUDENT") throw new TopicApprovalOperationError("학생만 학생 프로젝트 승인 요청을 만들 수 있습니다.");
    const { route, requestedProfessorId, sourceStudentTeamId, projectRepresentativeId, projectTeamName, ...topicInput } = input;
    const details = {
      ...topicInput,
      title: input.title.trim(),
      description: input.description.trim(),
      requiredSkills: [],
      preferredSkills: [],
      roleExpectations: "",
      availabilityRequirement: "",
      recruitmentEnabled: false,
      applicationMode: "TEAM_ONLY" as const,
      applicationQuestions: [],
      capacity: 1,
    };
    assertValidTopicDetails(details);
    const program = await this.programs.findOpen(input.programId);
    if (!program) throw new TopicApprovalOperationError("현재 프로젝트를 등록할 수 있는 공개 프로그램이 아닙니다.");
    const requestedAt = this.now();
    if (!isProjectRegistrationOpen(program, requestedAt)) {
      throw new TopicApprovalOperationError("현재 프로젝트 등록 기간이 아닙니다.");
    }
    if (!program.studentProjectCreationEnabled) {
      throw new TopicApprovalOperationError("이 프로그램은 학생 프로젝트 등록을 허용하지 않습니다.");
    }
    if (!sourceStudentTeamId) throw new TopicApprovalOperationError("프로젝트를 등록할 팀을 선택해 주세요.");
    if (!projectRepresentativeId) throw new TopicApprovalOperationError("프로젝트 대표를 지정해 주세요.");
    if (!projectTeamName?.trim()) throw new TopicApprovalOperationError("프로젝트 팀명을 입력해 주세요.");
    if (!program.advisorEnabled && route !== "ADMIN") {
      throw new TopicApprovalOperationError("지도교수가 없는 프로그램은 관리자에게만 승인을 요청할 수 있습니다.");
    }
    if (route === "PROFESSOR" && !requestedProfessorId) throw new TopicApprovalOperationError("승인을 요청할 교수를 지정해 주세요.");
    if (route === "ADMIN" && requestedProfessorId) throw new TopicApprovalOperationError("관리자 승인 요청에는 특정 관리자를 지정하지 않습니다.");
    const id = await this.repository.create({
      ...details,
      authorId: actor.id,
      route,
      requestedProfessorId: route === "PROFESSOR" ? requestedProfessorId! : null,
      sourceStudentTeamId,
      projectRepresentativeId,
      projectTeamName: projectTeamName.trim().slice(0, 100),
      requestedAt,
    });
    if (!id) throw new TopicApprovalOperationError("승인 대상 교수 또는 프로그램 상태를 확인해 주세요.");
    return id;
  }

  async list(actor: TopicApprovalViewer, requestedPage = 1, pageSize = 20, filter: TopicApprovalListFilter = {}): Promise<TopicApprovalRequestPage> {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    if (actor.role === "STUDENT" || actor.role === "PROFESSOR" || actor.role === "ADMIN") {
      return this.repository.listVisiblePage(actor, page, pageSize, filter);
    }
    return { items: [], page: 1, totalPages: 1, total: 0 };
  }

  async listAdminPendingCountsByProgram(actor: CurrentUser) {
    if (actor.role !== "ADMIN") return [];
    return this.repository.listAdminPendingCountsByProgram();
  }

  async listPendingForReview(actor: TopicApprovalViewer, pageSize = 5) {
    if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") return [];
    return (await this.repository.listVisiblePage(actor, 1, pageSize, { status: "PENDING" })).items;
  }

  async decide(actor: CurrentUser, input: { requestId: string; decision: "APPROVE" | "REJECT"; reviewComment: string }) {
    if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") throw new TopicApprovalOperationError("승인 요청을 처리할 권한이 없습니다.");
    const reviewComment = input.reviewComment.trim().slice(0, 1_000);
    if (input.decision === "REJECT" && !reviewComment) throw new TopicApprovalOperationError("반려 사유를 입력해 주세요.");
    const result = await this.repository.decide({ ...input, actorId: actor.id, actorRole: actor.role, reviewComment, decidedAt: this.now() });
    if (result !== "APPROVED" && result !== "REJECTED") {
      throw new TopicApprovalOperationError(
        result === "FORBIDDEN"
          ? "지정된 교수 또는 관리자만 처리할 수 있습니다."
          : "이미 처리되었거나 공개할 수 없는 요청입니다.",
      );
    }
  }

  async withdrawStudentRegistration(actor: CurrentUser, projectId: string) {
    if (actor.role !== "STUDENT") throw new TopicApprovalOperationError("학생 프로젝트 등록만 철회할 수 있습니다.");
    const result = await this.repository.withdraw({ projectId, requesterId: actor.id, withdrawnAt: this.now() });
    if (result === "WITHDRAWN") return;
    if (result === "FORBIDDEN") throw new TopicApprovalOperationError("프로젝트를 등록한 팀장만 철회할 수 있습니다.");
    throw new TopicApprovalOperationError("철회할 승인 대기 프로젝트를 찾을 수 없습니다.");
  }
}
