import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ManagedTopicReader, ManagedTopicSummary } from "@/modules/topic/application/topic-ports";

export class ManagedTopicNotFoundError extends Error {
  constructor() {
    super("관리할 수 있는 프로젝트를 찾을 수 없습니다.");
    this.name = "ManagedTopicNotFoundError";
  }
}

export class GetManagedTopicService {
  constructor(private readonly reader: ManagedTopicReader) {}

  async execute(actor: CurrentActor, id: string): Promise<ManagedTopicSummary> {
    const topic = await this.reader.findManaged(id, actor);
    if (!topic) throw new ManagedTopicNotFoundError();
    return topic;
  }
}
