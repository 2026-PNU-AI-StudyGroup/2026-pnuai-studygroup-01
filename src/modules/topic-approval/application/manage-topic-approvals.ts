import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";
import { assertValidTopicDetails, assertValidTopicSchedule } from "@/modules/topic/domain/topic-policy";

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
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewComment: string;
  createdAt: Date;
  decidedAt: Date | null;
};

export interface TopicApprovalRepository {
  listProfessors(): Promise<Array<{ id: string; name: string; email: string }>>;
  create(input: TopicDraft & { route: TopicApprovalRoute; requestedProfessorId: string | null; studentTeamId?: string; requestedAt: Date }): Promise<string | null>;
  listVisible(
    actor: CurrentUser,
    status?: TopicApprovalRequestSummary["status"],
  ): Promise<TopicApprovalRequestSummary[]>;
  decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "UNAVAILABLE">;
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
    input: Omit<TopicDraft, "authorId" | "academicCycleId"> & { route: TopicApprovalRoute; requestedProfessorId?: string; studentTeamId?: string },
  ) {
    if (actor.role !== "STUDENT") throw new TopicApprovalOperationError("학생만 학생 프로젝트 승인 요청을 만들 수 있습니다.");
    const details = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      requiredSkills: [...new Set(input.requiredSkills.map((skill) => skill.trim()).filter(Boolean))],
      preferredSkills: [...new Set(input.preferredSkills.map((skill) => skill.trim()).filter(Boolean))],
      roleExpectations: input.roleExpectations.trim(),
      availabilityRequirement: input.availabilityRequirement.trim(),
      applicationQuestions: input.applicationQuestions.map((question) => ({ ...question, label: question.label.trim() })),
    };
    assertValidTopicDetails(details);
    assertValidTopicSchedule(input);
    const program = await this.programs.findOpen(input.programId);
    if (!program) throw new TopicApprovalOperationError("현재 프로젝트를 등록할 수 있는 공개 프로그램이 아닙니다.");
    if (!program.studentProjectCreationEnabled) {
      throw new TopicApprovalOperationError("이 프로그램은 학생 프로젝트 생성을 허용하지 않습니다.");
    }
    if (!program.advisorEnabled && input.route !== "ADMIN") {
      throw new TopicApprovalOperationError("지도교수가 없는 프로그램은 관리자에게만 승인을 요청할 수 있습니다.");
    }
    if (input.route === "PROFESSOR" && !input.requestedProfessorId) throw new TopicApprovalOperationError("승인을 요청할 교수를 지정해 주세요.");
    if (input.route === "ADMIN" && input.requestedProfessorId) throw new TopicApprovalOperationError("관리자 승인 요청에는 특정 관리자를 지정하지 않습니다.");
    const times = [input.recruitmentStartsAt, input.recruitmentEndsAt, input.executionStartsAt, input.executionEndsAt, input.submissionStartsAt, input.submissionEndsAt];
    if (times.some((time) => time < program.startsAt || time > program.endsAt)) throw new TopicApprovalOperationError("프로젝트 일정은 프로그램 운영 기간 안에 있어야 합니다.");
    const id = await this.repository.create({
      ...details,
      authorId: actor.id,
      academicCycleId: program.academicCycleId,
      route: input.route,
      requestedProfessorId: input.route === "PROFESSOR" ? input.requestedProfessorId! : null,
      requestedAt: this.now(),
    });
    if (!id) throw new TopicApprovalOperationError("승인 대상 교수 또는 프로그램 상태를 확인해 주세요.");
    return id;
  }

  async list(actor: CurrentUser) {
    if (actor.role === "STUDENT" || actor.role === "PROFESSOR" || actor.role === "ADMIN") return this.repository.listVisible(actor);
    return [];
  }

  async listPendingForReview(actor: CurrentUser) {
    if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") return [];
    return this.repository.listVisible(actor, "PENDING");
  }

  async decide(actor: CurrentUser, input: { requestId: string; decision: "APPROVE" | "REJECT"; reviewComment: string }) {
    if (actor.role !== "PROFESSOR" && actor.role !== "ADMIN") throw new TopicApprovalOperationError("승인 요청을 처리할 권한이 없습니다.");
    const result = await this.repository.decide({ ...input, actorId: actor.id, actorRole: actor.role, reviewComment: input.reviewComment.trim().slice(0, 1_000), decidedAt: this.now() });
    if (result !== "APPROVED" && result !== "REJECTED") throw new TopicApprovalOperationError(result === "FORBIDDEN" ? "지정된 교수 또는 관리자만 처리할 수 있습니다." : "이미 처리되었거나 공개할 수 없는 요청입니다.");
  }
}
