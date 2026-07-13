import type { PrismaClient } from "@/generated/prisma/client";
import type {
  TopicCreator,
  TopicDraft,
} from "@/modules/topic/application/topic-ports";

export class PrismaTopicRepository implements TopicCreator {
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
}
