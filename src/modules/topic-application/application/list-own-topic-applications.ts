import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  OwnTopicApplicationStatus,
  TopicApplicationLister,
  TopicApplicationPage,
} from "@/modules/topic-application/application/topic-application-ports";
import { assertCanApplyToTopic } from "@/modules/topic-application/domain/topic-application-policy";

export class ListOwnTopicApplicationsService {
  constructor(private readonly repository: TopicApplicationLister) {}

  async execute(
    actor: CurrentActor,
    requestedPage = 1,
    requestedPageSize = 20,
    status?: OwnTopicApplicationStatus,
  ): Promise<TopicApplicationPage> {
    assertCanApplyToTopic(actor);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 20) : 20;
    return this.repository.listByStudent(actor.id, page, pageSize, status);
  }

  async findForTopic(actor: CurrentActor, topicId: string) {
    assertCanApplyToTopic(actor);
    return this.repository.findByStudentAndTopic(actor.id, topicId);
  }
}
