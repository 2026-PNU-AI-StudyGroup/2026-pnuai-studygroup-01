import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AcceptTopicApplicationOutcome,
  RejectTopicApplicationOutcome,
  TopicApplicationDecisionActor,
  TopicApplicationDecisionRepository,
  TopicApplicationDecisionState,
} from "@/modules/topic-application/application/topic-application-ports";
import { PrismaTopicApplicationAcceptance } from "@/modules/topic-application/infrastructure/prisma-topic-application-acceptance";
import { PrismaTopicApplicationRejection } from "@/modules/topic-application/infrastructure/prisma-topic-application-rejection";

export class PrismaTopicApplicationDecisionRepository
  implements TopicApplicationDecisionRepository
{
  private readonly acceptance: PrismaTopicApplicationAcceptance;
  private readonly rejection: PrismaTopicApplicationRejection;

  constructor(private readonly client: PrismaClient) {
    this.acceptance = new PrismaTopicApplicationAcceptance(client);
    this.rejection = new PrismaTopicApplicationRejection(client);
  }

  findDecisionState(
    id: string,
  ): Promise<TopicApplicationDecisionState | null> {
    return this.client.topicApplication.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        topic: { select: { authorId: true } },
      },
    }).then((application) =>
      application
        ? {
            id: application.id,
            status: application.status,
            topicAuthorId: application.topic.authorId,
          }
        : null,
    );
  }

  accept(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment = "",
  ): Promise<AcceptTopicApplicationOutcome> {
    return this.acceptance.accept(id, actor, decidedAt, reviewComment);
  }

  reject(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment = "",
  ): Promise<RejectTopicApplicationOutcome> {
    return this.rejection.reject(id, actor, decidedAt, reviewComment);
  }
}
