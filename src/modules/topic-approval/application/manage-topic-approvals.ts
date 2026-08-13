import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";
import { assertValidTopicDetails } from "@/modules/topic/domain/topic-policy";
import { isProjectRegistrationOpen } from "@/modules/project-program/domain/project-program-policy";

export type TopicApprovalRoute = "PROFESSOR" | "ADMIN";
export type TopicApprovalRequestSummary = {
  id: string;
  topicId: string;
  topicTitle: string;
  requesterId: string;
  requesterName: string;
  route: TopicApprovalRoute;
  requestedProfessorId: string | null;
  requestedProfessorName: string | null;
  studentTeamVersion?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "CANCELED";
  reviewComment: string;
  createdAt: Date;
  decidedAt: Date | null;
};

export type TopicApprovalRequestPage = {
  items: TopicApprovalRequestSummary[];
  page: number;
  totalPages: number;
  total: number;
};

export type TopicApprovalRequestDetail = TopicApprovalRequestSummary & {
  programName: string;
  programCategory: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  roleExpectations: string;
  availabilityRequirement: string;
  applicationMode: "TEAM_ONLY" | "INDIVIDUAL_ONLY" | "INDIVIDUAL_OR_TEAM";
  capacity: number;
  programRecruitmentStartsAt: Date;
  programRecruitmentEndsAt: Date;
  programExecutionStartsAt: Date;
  programExecutionEndsAt: Date;
  programSubmissionStartsAt: Date;
  programSubmissionEndsAt: Date;
  applicationQuestions: Array<{ id: string; label: string; maxLength: number; required: boolean }>;
  studentTeam: {
    name: string;
    members: Array<{ id: string; name: string; email: string; role: "LEADER" | "MEMBER" }>;
  } | null;
};

export interface TopicApprovalRepository {
  listProfessors(): Promise<Array<{ id: string; name: string; email: string }>>;
  create(input: TopicDraft & { route: TopicApprovalRoute; requestedProfessorId: string | null; studentTeamId?: string; requestedAt: Date }): Promise<string | null>;
  listVisiblePage(
    actor: CurrentUser,
    page: number,
    pageSize: number,
    status?: TopicApprovalRequestSummary["status"],
  ): Promise<TopicApprovalRequestPage>;
  findVisible(actor: CurrentUser, requestId: string): Promise<TopicApprovalRequestDetail | null>;
  decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; studentTeamVersion?: number; teamCompositionConfirmed?: boolean; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "TEAM_CHANGED" | "UNAVAILABLE">;
}

export class TopicApprovalOperationError extends Error {}

export class TopicApprovalService {
  constructor(
    private readonly repository: TopicApprovalRepository,
    private readonly programs: Pick<ProjectProgramRepository, "findOpen">,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listProfessors() { return this.repository.listProfessors(); }

  async createStudentProposal(
    actor: CurrentUser,
    input: Omit<TopicDraft, "authorId"> & { route: TopicApprovalRoute; requestedProfessorId?: string; studentTeamId?: string },
  ) {
    if (actor.role !== "STUDENT") throw new TopicApprovalOperationError("학생만 학생 프로젝트 승인 요청을 만들 수 있습니다.");
    const { route, requestedProfessorId, studentTeamId, ...topicInput } = input;
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
      throw new TopicApprovalOperationError("이 프로그램은 학생 프로젝트 제안을 허용하지 않습니다.");
    }
    if (!studentTeamId) throw new TopicApprovalOperationError("프로젝트를 제안할 팀을 선택해 주세요.");
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
      studentTeamId,
      requestedAt,
    });
    if (!id) throw new TopicApprovalOperationError("승인 대상 교수 또는 프로그램 상태를 확인해 주세요.");
    return id;
  }

  async list(actor: CurrentUser, requestedPage = 1, pageSize = 20): Promise<TopicApprovalRequestPage> {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    if (actor.role === "STUDENT" || actor.role === "PROFESSOR" || actor.role === "ADMIN") {
      return this.repository.listVisiblePage(actor, page, pageSize);
    }
    return { items: [], page: 1, totalPages: 1, total: 0 };
  }

  async get(actor: CurrentUser, requestId: string): Promise<TopicApprovalRequestDetail | null> {
    return this.repository.findVisible(actor, requestId);
  }

  async listPendingForReview(actor: CurrentUser, pageSize = 5) {
    if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") return [];
    return (await this.repository.listVisiblePage(actor, 1, pageSize, "PENDING")).items;
  }

  async decide(actor: CurrentUser, input: { requestId: string; decision: "APPROVE" | "REJECT"; reviewComment: string; studentTeamVersion?: number; teamCompositionConfirmed?: boolean }) {
    if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") throw new TopicApprovalOperationError("승인 요청을 처리할 권한이 없습니다.");
    const reviewComment = input.reviewComment.trim().slice(0, 1_000);
    if (input.decision === "REJECT" && !reviewComment) throw new TopicApprovalOperationError("반려 사유를 입력해 주세요.");
    if (input.decision === "APPROVE" && input.studentTeamVersion != null && !input.teamCompositionConfirmed) {
      throw new TopicApprovalOperationError("현재 팀 구성을 확인해 주세요.");
    }
    const result = await this.repository.decide({ ...input, actorId: actor.id, actorRole: actor.role, reviewComment, decidedAt: this.now() });
    if (result !== "APPROVED" && result !== "REJECTED") {
      throw new TopicApprovalOperationError(
        result === "FORBIDDEN"
          ? "지정된 교수 또는 관리자만 처리할 수 있습니다."
          : result === "TEAM_CHANGED"
            ? "승인 요청 뒤 팀 구성이 변경되었습니다. 새 구성으로 다시 제안해 주세요."
            : "이미 처리되었거나 공개할 수 없는 요청입니다.",
      );
    }
  }
}
