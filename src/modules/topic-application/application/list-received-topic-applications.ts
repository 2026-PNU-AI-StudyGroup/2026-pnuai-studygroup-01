import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationPage,
  ProfessorTopicApplicationStatus,
} from "@/modules/topic-application/application/topic-application-ports";

export class ListReceivedTopicApplicationsService {
  constructor(private readonly repository: ProfessorTopicApplicationLister) {}

  async execute(
    actor: CurrentActor,
    requestedPage = 1,
    requestedPageSize = 20,
    status?: ProfessorTopicApplicationStatus,
    rawQuery = "",
  ): Promise<ProfessorTopicApplicationPage> {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 50)
      : 20;
    const query = rawQuery.trim().slice(0, 100);

    return this.repository.listForActor(actor, {
      page,
      pageSize,
      status,
      query,
    });
  }
}
