import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ProfessorTopicApplicationReader,
  ProfessorTopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";

export class ReceivedTopicApplicationReadingForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 받은 지원서를 조회할 수 있습니다.");
    this.name = "ReceivedTopicApplicationReadingForbiddenError";
  }
}

export class ReceivedTopicApplicationNotFoundError extends Error {
  constructor() {
    super("조회할 수 있는 지원서를 찾지 못했습니다.");
    this.name = "ReceivedTopicApplicationNotFoundError";
  }
}

export class GetReceivedTopicApplicationService {
  constructor(private readonly repository: ProfessorTopicApplicationReader) {}

  async execute(
    actor: CurrentActor,
    applicationId: string,
  ): Promise<ProfessorTopicApplicationSummary> {
    const application = await this.repository.findVisibleById(applicationId, actor);
    if (!application) {
      throw new ReceivedTopicApplicationNotFoundError();
    }
    return application;
  }
}
