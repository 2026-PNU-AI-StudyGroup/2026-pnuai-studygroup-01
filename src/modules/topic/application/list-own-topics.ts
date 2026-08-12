import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TopicLister,
  ManagedTopicPage,
} from "@/modules/topic/application/topic-ports";

export class TopicListingForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 등록한 프로젝트를 조회할 수 있습니다.");
    this.name = "TopicListingForbiddenError";
  }
}

export class ListOwnTopicsService {
  constructor(private readonly repository: TopicLister) {}

  async execute(actor: CurrentActor, requestedPage = 1): Promise<ManagedTopicPage> {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    return this.repository.listPageForActor(actor, page, 20);
  }
}
