import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  TopicCreator,
  TopicDraft,
  TopicLister,
  PublicTopicLister,
  PublicTopicSummary,
  TopicStateRecord,
  TopicStateRepository,
  TopicSummary,
} from "@/modules/topic/application/topic-ports";

export class PrismaTopicRepository
  implements TopicCreator, TopicLister, TopicStateRepository, PublicTopicLister
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
    const result = await this.client.topic.updateMany({
      where: { id, status: "PUBLISHED" },
      data: { status: "CLOSED" },
    });
    return result.count === 1;
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
