import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  CreateTopicApplicationInput,
  CreateTopicApplicationResult,
  TopicApplicationCreator,
  TopicApplicationLister,
  TopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";

export class PrismaTopicApplicationRepository
  implements TopicApplicationCreator, TopicApplicationLister
{
  constructor(private readonly client: PrismaClient) {}

  async createIfAvailable(
    input: CreateTopicApplicationInput,
  ): Promise<CreateTopicApplicationResult> {
    const id = randomUUID();
    const rows = await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      WITH "available_topic" AS (
        SELECT "id"
        FROM "topic"
        WHERE "id" = ${input.topicId}
          AND "status" = 'PUBLISHED'
          AND "recruitmentStartsAt" <= ${input.appliedAt}
          AND "recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE
      )
      INSERT INTO "topic_application" (
        "id", "topicId", "studentId", "message", "status",
        "decidedAt", "createdAt", "updatedAt"
      )
      SELECT
        ${id}, ${input.topicId}, ${input.studentId}, ${input.message},
        'PENDING'::"TopicApplicationStatus", NULL, ${input.appliedAt}, ${input.appliedAt}
      FROM "available_topic"
      ON CONFLICT ("topicId", "studentId") DO NOTHING
      RETURNING "id"
    `);

    if (rows[0]) {
      return { outcome: "CREATED", id: rows[0].id };
    }

    const existing = await this.client.topicApplication.findUnique({
      where: {
        topicId_studentId: {
          topicId: input.topicId,
          studentId: input.studentId,
        },
      },
      select: { id: true },
    });
    return existing
      ? { outcome: "ALREADY_APPLIED" }
      : { outcome: "TOPIC_UNAVAILABLE" };
  }

  listByStudent(studentId: string): Promise<TopicApplicationSummary[]> {
    return this.client.topicApplication.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        topicId: true,
        status: true,
        message: true,
        createdAt: true,
      },
    });
  }
}
