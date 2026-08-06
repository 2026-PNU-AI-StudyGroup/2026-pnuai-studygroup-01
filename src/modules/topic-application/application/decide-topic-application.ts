import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicApplicationDecisionRepository } from "@/modules/topic-application/application/topic-application-ports";
import { canManageTopic } from "@/modules/topic/domain/topic-policy";

export class TopicApplicationNotFoundError extends Error {
  constructor() {
    super("지원서를 찾을 수 없습니다.");
    this.name = "TopicApplicationNotFoundError";
  }
}

export class TopicApplicationDecisionForbiddenError extends Error {
  constructor() {
    super("주제 작성자 또는 관리자만 지원서를 처리할 수 있습니다.");
    this.name = "TopicApplicationDecisionForbiddenError";
  }
}

export class TopicApplicationDecisionConflictError extends Error {
  constructor(message = "이미 처리되었거나 현재 처리할 수 없는 지원서입니다.") {
    super(message);
    this.name = "TopicApplicationDecisionConflictError";
  }
}

export class TopicApplicationReviewCommentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TopicApplicationReviewCommentError";
  }
}

function normalizeReviewComment(comment: string, required: boolean): string {
  const normalized = comment.trim();
  if (normalized.length > 2_000) {
    throw new TopicApplicationReviewCommentError("검토 의견은 2,000자 이내로 입력해 주세요.");
  }
  if (required && !normalized) {
    throw new TopicApplicationReviewCommentError("미선정 사유를 검토 의견에 입력해 주세요.");
  }
  return normalized;
}

export class DecideTopicApplicationService {
  constructor(
    private readonly repository: TopicApplicationDecisionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async accept(actor: CurrentActor, applicationId: string, reviewComment = ""): Promise<void> {
    await this.requirePendingAndManageable(actor, applicationId);
    const normalizedComment = normalizeReviewComment(reviewComment, false);
    const outcome = await this.repository.accept(
      applicationId,
      { id: actor.id, isAdmin: actor.role === "ADMIN" },
      this.now(),
      normalizedComment,
    );

    if (outcome === "CAPACITY_REACHED") {
      throw new TopicApplicationDecisionConflictError(
        "주제의 모집 정원이 이미 찼습니다.",
      );
    }
    if (outcome === "STUDENT_ALREADY_ASSIGNED") {
      throw new TopicApplicationDecisionConflictError(
        "학생이 이미 같은 프로그램의 다른 팀에 소속되어 있습니다.",
      );
    }
    if (outcome === "CONFLICT") {
      throw new TopicApplicationDecisionConflictError();
    }
    if (outcome === "FORBIDDEN") {
      throw new TopicApplicationDecisionForbiddenError();
    }
  }

  async reject(actor: CurrentActor, applicationId: string, reviewComment: string): Promise<void> {
    await this.requirePendingAndManageable(actor, applicationId);
    const normalizedComment = normalizeReviewComment(reviewComment, true);
    const outcome = await this.repository.reject(
      applicationId,
      { id: actor.id, isAdmin: actor.role === "ADMIN" },
      this.now(),
      normalizedComment,
    );
    if (outcome === "FORBIDDEN") {
      throw new TopicApplicationDecisionForbiddenError();
    }
    if (outcome === "CONFLICT") {
      throw new TopicApplicationDecisionConflictError();
    }
  }

  private async requirePendingAndManageable(
    actor: CurrentActor,
    applicationId: string,
  ): Promise<void> {
    const application = await this.repository.findDecisionState(applicationId);
    if (!application) {
      throw new TopicApplicationNotFoundError();
    }
    if (!canManageTopic(
      actor,
      application.topicManagerId,
      application.topicAssistantIds,
    )) {
      throw new TopicApplicationDecisionForbiddenError();
    }
    if (application.status !== "PENDING") {
      throw new TopicApplicationDecisionConflictError();
    }
  }
}
