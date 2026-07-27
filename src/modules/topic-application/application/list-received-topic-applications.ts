import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";

export class ListReceivedTopicApplicationsService {
  constructor(private readonly repository: ProfessorTopicApplicationLister) {}

  async execute(
    actor: CurrentActor,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    return this.repository.listForActor(actor.id, actor.role === "ADMIN");
  }
}
