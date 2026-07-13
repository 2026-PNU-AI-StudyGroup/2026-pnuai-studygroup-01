import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TopicLister,
  TopicSummary,
} from "@/modules/topic/application/topic-ports";
import { canCreateTopic } from "@/modules/topic/domain/topic-policy";

export class TopicListingForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 등록한 주제를 조회할 수 있습니다.");
    this.name = "TopicListingForbiddenError";
  }
}

export class ListOwnTopicsService {
  constructor(private readonly repository: TopicLister) {}

  async execute(actor: CurrentActor): Promise<TopicSummary[]> {
    if (!canCreateTopic(actor)) {
      throw new TopicListingForbiddenError();
    }

    return this.repository.listByAuthor(actor.id);
  }
}
