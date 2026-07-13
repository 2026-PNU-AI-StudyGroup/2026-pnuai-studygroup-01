import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";
import { canCreateTopic } from "@/modules/topic/domain/topic-policy";

export class ReceivedTopicApplicationListingForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 받은 지원서를 조회할 수 있습니다.");
    this.name = "ReceivedTopicApplicationListingForbiddenError";
  }
}

export class ListReceivedTopicApplicationsService {
  constructor(private readonly repository: ProfessorTopicApplicationLister) {}

  async execute(
    actor: CurrentActor,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    if (!canCreateTopic(actor)) {
      throw new ReceivedTopicApplicationListingForbiddenError();
    }
    return actor.role === "ADMIN"
      ? this.repository.listAll()
      : this.repository.listByTopicAuthor(actor.id);
  }
}
