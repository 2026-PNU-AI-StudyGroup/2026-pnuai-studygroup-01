import type {
  PublicTopicLister,
  PublicTopicSummary,
} from "@/modules/topic/application/topic-ports";

export class ListPublishedTopicsService {
  constructor(private readonly repository: PublicTopicLister) {}

  execute(): Promise<PublicTopicSummary[]> {
    return this.repository.listPublished();
  }
}
