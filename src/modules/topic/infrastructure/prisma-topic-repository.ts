import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type {
  TopicCreator,
  TopicDraft,
  TopicLister,
  PublicTopicLister,
  PublicTopicSummary,
  TopicStateRecord,
  TopicStateRepository,
  TopicScheduleUpdater,
  TopicSummary,
} from "@/modules/topic/application/topic-ports";
import type { TopicSchedule } from "@/modules/topic/domain/topic-policy";

export class PrismaTopicRepository
  implements TopicCreator, TopicLister, TopicStateRepository, TopicScheduleUpdater, PublicTopicLister
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
      return transaction.topic.create({
        data: {
          ...topic,
          status: "DRAFT",
          publishedAt: null,
        },
        select: { id: true },
      });
    });
  }

  listByAuthor(authorId: string): Promise<TopicSummary[]> {
    return this.list({ authorId });
  }

  listAll(): Promise<TopicSummary[]> {
    return this.list({});
  }

  private list(where: Prisma.TopicWhereInput): Promise<TopicSummary[]> {
    return this.client.topic.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        academicCycleId: true,
        authorId: true,
        author: { select: { name: true } },
        title: true,
        description: true,
        programId: true,
        requiredSkills: true,
        preferredSkills: true,
        roleExpectations: true,
        availabilityRequirement: true,
        capacity: true,
        recruitmentStartsAt: true,
        recruitmentEndsAt: true,
        executionStartsAt: true,
        executionEndsAt: true,
        submissionStartsAt: true,
        submissionEndsAt: true,
        status: true,
        publishedAt: true,
        program: { select: { name: true, category: true, status: true } },
      },
    }).then((topics) => topics.map(({ author, program, ...topic }) => ({
      ...topic,
      authorName: author.name,
      programName: program.name,
      programCategory: program.category,
      programStatus: program.status,
    })));
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
        },
        data: { status: "PUBLISHED", publishedAt },
      });
      return result.count === 1;
    });
  }

  async closePublished(id: string): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const applications = await transaction.topicApplication.findMany({
        where: { topicId: id, status: "PENDING" },
        select: { id: true, studentId: true, topic: { select: { title: true } } },
      });
      const result = await transaction.topic.updateMany({
        where: { id, status: "PUBLISHED" },
        data: { status: "CLOSED" },
      });
      if (result.count !== 1) return false;
      await transaction.topicApplication.updateMany({ where: { topicId: id, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      await transaction.recruitmentPost.updateMany({ where: { team: { topicId: id }, status: "OPEN" }, data: { status: "CLOSED" } });
      await transaction.recruitmentApplication.updateMany({ where: { post: { team: { topicId: id } }, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      await createApplicationResultNotifications(transaction, applications.map((application) => ({
        applicationId: application.id,
        recipientId: application.studentId,
        topicTitle: application.topic.title,
        outcome: "REJECTED",
        createdAt: decidedAt,
      })));
      return true;
    });
  }

  async updateSchedule(id: string, actor: CurrentActor, schedule: TopicSchedule): Promise<boolean> {
    const changedAt = new Date();
    const rows = await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE "topic"
      SET
        "recruitmentStartsAt" = ${schedule.recruitmentStartsAt},
        "recruitmentEndsAt" = ${schedule.recruitmentEndsAt},
        "executionStartsAt" = ${schedule.executionStartsAt},
        "executionEndsAt" = ${schedule.executionEndsAt},
        "submissionStartsAt" = ${schedule.submissionStartsAt},
        "submissionEndsAt" = ${schedule.submissionEndsAt},
        "updatedAt" = ${changedAt}
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

  async listPublished(programId?: string): Promise<PublicTopicSummary[]> {
    const topics = await this.client.topic.findMany({
      where: { status: "PUBLISHED", programId, program: { status: "OPEN" } },
      orderBy: { publishedAt: "desc" },
      include: {
        author: { select: { name: true } },
        academicCycle: { select: { academicYear: true, term: true } },
        program: { select: { name: true, category: true, status: true } },
        team: { select: { _count: { select: { members: true } } } },
      },
    });

    return topics.map(({ author, academicCycle, program, team, ...topic }) => ({
      ...topic,
      authorName: author.name,
      academicYear: academicCycle.academicYear,
      term: academicCycle.term,
      programName: program.name,
      programCategory: program.category,
      programStatus: program.status,
      memberCount: team?._count.members ?? 0,
    }));
  }
}
