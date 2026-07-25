import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type {
  TopicCreator,
  TopicDraft,
  TopicScheduleUpdater,
  TopicStateRecord,
  TopicStateRepository,
} from "@/modules/topic/application/topic-ports";
import type { TopicSchedule } from "@/modules/topic/domain/topic-policy";

export class PrismaTopicCommandRepository
  implements TopicCreator, TopicStateRepository, TopicScheduleUpdater
{
  constructor(private readonly client: PrismaClient) {}

  createDraft(topic: TopicDraft): Promise<{ id: string } | null> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program"
        WHERE "id" = ${topic.programId} AND "status" = 'OPEN'::"ProjectProgramStatus"
        FOR SHARE
      `);
      if (!programs[0]) return null;
      const { applicationQuestions, ...topicData } = topic;
      return transaction.topic.create({
        data: {
          ...topicData,
          applicationQuestions: {
            create: applicationQuestions.map((question, position) => ({
              ...question,
              position,
            })),
          },
          status: "DRAFT",
          publishedAt: null,
        },
        select: { id: true },
      });
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
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program"
        JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${id} AND "project_program"."status" = 'OPEN'::"ProjectProgramStatus"
        FOR SHARE OF "project_program"
      `);
      if (!programs[0]) return false;
      const result = await transaction.topic.updateMany({
        where: {
          id,
          status: "DRAFT",
          recruitmentEndsAt: { gt: publishedAt },
          requiredSkills: { isEmpty: false },
          roleExpectations: { not: "" },
          availabilityRequirement: { not: "" },
          applicationQuestions: { some: {} },
        },
        data: { status: "PUBLISHED", publishedAt },
      });
      return result.count === 1;
    });
  }

  async closePublished(id: string): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const result = await transaction.topic.updateMany({
        where: { id, status: "PUBLISHED" },
        data: { status: "CLOSED" },
      });
      if (result.count !== 1) return false;
      const applications = await transaction.topicApplication.findMany({
        where: { topicId: id, status: "PENDING" },
        select: {
          id: true,
          studentId: true,
          topic: { select: { title: true } },
        },
      });
      await transaction.teamApplicationDraft.deleteMany({
        where: { topicId: id },
      });
      await transaction.topicApplication.updateMany({
        where: { topicId: id, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
      await transaction.recruitmentPost.updateMany({
        where: { team: { topicId: id }, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { post: { team: { topicId: id } }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
      await createApplicationResultNotifications(
        transaction,
        applications.map((application) => ({
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "REJECTED",
          createdAt: decidedAt,
        })),
      );
      return true;
    });
  }

  async updateSchedule(
    id: string,
    actor: CurrentActor,
    schedule: TopicSchedule,
  ): Promise<boolean> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE "topic"
      SET
        "recruitmentStartsAt" = ${schedule.recruitmentStartsAt},
        "recruitmentEndsAt" = ${schedule.recruitmentEndsAt},
        "executionStartsAt" = ${schedule.executionStartsAt},
        "executionEndsAt" = ${schedule.executionEndsAt},
        "submissionStartsAt" = ${schedule.submissionStartsAt},
        "submissionEndsAt" = ${schedule.submissionEndsAt},
        "updatedAt" = ${new Date()}
      FROM "project_program"
      WHERE "topic"."id" = ${id}
        AND "topic"."programId" = "project_program"."id"
        AND "topic"."status" <> 'CLOSED'::"TopicStatus"
        AND "project_program"."status" = 'OPEN'::"ProjectProgramStatus"
        AND (${actor.role}::"UserRole" = 'ADMIN'::"UserRole" OR "topic"."authorId" = ${actor.id})
        AND ${schedule.recruitmentStartsAt} >= "project_program"."startsAt"
        AND ${schedule.recruitmentEndsAt} <= "project_program"."endsAt"
        AND ${schedule.executionStartsAt} >= "project_program"."startsAt"
        AND ${schedule.executionEndsAt} <= "project_program"."endsAt"
        AND ${schedule.submissionStartsAt} >= "project_program"."startsAt"
        AND ${schedule.submissionEndsAt} <= "project_program"."endsAt"
      RETURNING "topic"."id"
    `);
    return rows.length === 1;
  }
}
