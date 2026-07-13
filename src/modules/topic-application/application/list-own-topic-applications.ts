import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TopicApplicationLister,
  TopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";
import { assertCanApplyToTopic } from "@/modules/topic-application/domain/topic-application-policy";

export class ListOwnTopicApplicationsService {
  constructor(private readonly repository: TopicApplicationLister) {}

  async execute(actor: CurrentActor): Promise<TopicApplicationSummary[]> {
    assertCanApplyToTopic(actor);
    return this.repository.listByStudent(actor.id);
  }
}
