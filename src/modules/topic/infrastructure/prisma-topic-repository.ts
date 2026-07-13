import type { PrismaClient } from "@/generated/prisma/client";
import type {
  TopicCreator,
  TopicDraft,
  TopicLister,
  TopicSummary,
} from "@/modules/topic/application/topic-ports";

export class PrismaTopicRepository implements TopicCreator, TopicLister {
  constructor(private readonly client: PrismaClient) {}

  createDraft(topic: TopicDraft): Promise<{ id: string }> {
    return this.client.topic.create({
      data: {
        ...topic,
        status: "DRAFT",
        publishedAt: null,
      },
      select: { id: true },
    });
  }

  listByAuthor(authorId: string): Promise<TopicSummary[]> {
    return this.client.topic.findMany({
      where: { authorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        academicCycleId: true,
        authorId: true,
        title: true,
        description: true,
        capacity: true,
        recruitmentStartsAt: true,
        recruitmentEndsAt: true,
        executionStartsAt: true,
        executionEndsAt: true,
        submissionStartsAt: true,
        submissionEndsAt: true,
        status: true,
        publishedAt: true,
      },
    });
  }
}
