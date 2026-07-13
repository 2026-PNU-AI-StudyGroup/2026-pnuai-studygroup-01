import type { PrismaClient } from "@/generated/prisma/client";
import type {
  TopicCreator,
  TopicDraft,
  TopicLister,
  TopicStateRecord,
  TopicStateRepository,
  TopicSummary,
} from "@/modules/topic/application/topic-ports";

export class PrismaTopicRepository
  implements TopicCreator, TopicLister, TopicStateRepository
{
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

  findState(id: string): Promise<TopicStateRecord | null> {
    return this.client.topic.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        recruitmentEndsAt: true,
      },
    });
  }

  async publishDraft(id: string, publishedAt: Date): Promise<boolean> {
    const result = await this.client.topic.updateMany({
      where: {
        id,
        status: "DRAFT",
        recruitmentEndsAt: { gt: publishedAt },
      },
      data: { status: "PUBLISHED", publishedAt },
    });
    return result.count === 1;
  }

  async closePublished(id: string): Promise<boolean> {
    const result = await this.client.topic.updateMany({
      where: { id, status: "PUBLISHED" },
      data: { status: "CLOSED" },
    });
    return result.count === 1;
  }
}
