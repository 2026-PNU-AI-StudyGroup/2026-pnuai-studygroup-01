import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ManagedTopicReader, TopicSummary } from "@/modules/topic/application/topic-ports";
import { canCreateTopic } from "@/modules/topic/domain/topic-policy";

export class ManagedTopicNotFoundError extends Error {
  constructor() {
    super("관리할 수 있는 주제를 찾을 수 없습니다.");
    this.name = "ManagedTopicNotFoundError";
  }
}

export class GetManagedTopicService {
  constructor(private readonly reader: ManagedTopicReader) {}

  async execute(actor: CurrentActor, id: string): Promise<TopicSummary> {
    if (!canCreateTopic(actor)) throw new ManagedTopicNotFoundError();
    const topic = await this.reader.findManaged(id, actor);
    if (!topic) throw new ManagedTopicNotFoundError();
    return topic;
  }
}
