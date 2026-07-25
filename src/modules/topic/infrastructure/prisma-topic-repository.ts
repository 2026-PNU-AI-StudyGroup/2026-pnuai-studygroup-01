import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type {
  TopicCreator,
  TopicDraft,
  TopicLister,
  PublicTopicLister,
  PublicTopicPage,
  PublicTopicPhase,
  PublicTopicQuery,
  PublicTopicSummary,
  TopicStateRecord,
  TopicStateRepository,
  TopicScheduleUpdater,
  TopicSummary,
  ManagedTopicReader,
} from "@/modules/topic/application/topic-ports";
import type { TopicSchedule } from "@/modules/topic/domain/topic-policy";

const publicTopicInclude = {
  author: { select: { name: true, role: true } },
  academicCycle: { select: { academicYear: true, term: true } },
  program: { select: { name: true, category: true, status: true } },
  team: { select: { _count: { select: { members: true } } } },
  applicationQuestions: { orderBy: { position: "asc" as const }, select: { id: true, label: true, maxLength: true, required: true, position: true } },
} satisfies Prisma.TopicInclude;

const managedTopicSelect = {
  id: true,
  academicCycleId: true,
  authorId: true,
  author: { select: { name: true, role: true } },
  title: true,
  description: true,
  programId: true,
  requiredSkills: true,
  preferredSkills: true,
  roleExpectations: true,
  availabilityRequirement: true,
  applicationMode: true,
  applicationQuestions: { orderBy: { position: "asc" }, select: { id: true, label: true, maxLength: true, required: true, position: true } },
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
} satisfies Prisma.TopicSelect;

type ManagedTopicRow = Prisma.TopicGetPayload<{ select: typeof managedTopicSelect }>;

function toTopicSummary({ author, program, ...topic }: ManagedTopicRow): TopicSummary {
  return { ...topic, authorName: author.name, authorRole: author.role, programName: program.name, programCategory: program.category, programStatus: program.status };
}

type PublicTopicRow = Prisma.TopicGetPayload<{ include: typeof publicTopicInclude }>;

function toPublicTopic(
  { author, academicCycle, program, team, ...topic }: PublicTopicRow,
  ownApplicationStatus: PublicTopicSummary["ownApplicationStatus"] = null,
): PublicTopicSummary {
  return {
    ...topic,
    authorName: author.name,
    authorRole: author.role,
    academicYear: academicCycle.academicYear,
    term: academicCycle.term,
    programName: program.name,
    programCategory: program.category,
    programStatus: program.status,
    memberCount: team?._count.members ?? 0,
    ownApplicationStatus,
  };
}

function phaseWhere(phase: PublicTopicPhase, now: Date): Prisma.TopicWhereInput {
  if (phase === "RECRUITING") return { recruitmentStartsAt: { lte: now }, recruitmentEndsAt: { gt: now } };
  if (phase === "CLOSING_SOON") {
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000);
    return { recruitmentStartsAt: { lte: now }, recruitmentEndsAt: { gt: now, lte: sevenDaysLater } };
  }
  return {};
}

export class PrismaTopicRepository
  implements TopicCreator, TopicLister, ManagedTopicReader, TopicStateRepository, TopicScheduleUpdater, PublicTopicLister
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
            create: applicationQuestions.map((question, position) => ({ ...question, position })),
          },
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
      select: managedTopicSelect,
    }).then((topics) => topics.map(toTopicSummary));
  }

  async findManaged(id: string, actor: CurrentActor): Promise<TopicSummary | null> {
    const topic = await this.client.topic.findFirst({
      where: { id, ...(actor.role === "ADMIN" ? {} : { authorId: actor.id }) },
      select: managedTopicSelect,
    });
    return topic ? toTopicSummary(topic) : null;
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
        select: { id: true, studentId: true, topic: { select: { title: true } } },
      });
      await transaction.teamApplicationDraft.deleteMany({ where: { topicId: id } });
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

  async listPublished(query: PublicTopicQuery): Promise<PublicTopicPage> {
    const escapedSkillQuery = query.query.toLowerCase().replace(/[\\%_]/g, "\\$&");
    const skillTopicIds = query.query
      ? await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id" FROM "topic"
          WHERE lower(array_to_string("requiredSkills", ' ')) LIKE ${`%${escapedSkillQuery}%`} ESCAPE '\'
             OR lower(array_to_string("preferredSkills", ' ')) LIKE ${`%${escapedSkillQuery}%`} ESCAPE '\'
        `)
      : [];
    const search: Prisma.TopicWhereInput = query.query ? { OR: [
      { title: { contains: escapedSkillQuery, mode: "insensitive" } },
      { description: { contains: escapedSkillQuery, mode: "insensitive" } },
      { id: { in: skillTopicIds.map(({ id }) => id) } },
      { author: { name: { contains: escapedSkillQuery, mode: "insensitive" } } },
      { program: { name: { contains: escapedSkillQuery, mode: "insensitive" } } },
    ] } : {};
    const baseWhere: Prisma.TopicWhereInput = {
      status: "PUBLISHED",
      programId: query.programId,
      program: { status: "OPEN" },
      ...search,
    };
    const where: Prisma.TopicWhereInput = { AND: [baseWhere, phaseWhere(query.phase, query.now)] };
    const [total, activeCount, recruitingCount, closingSoonCount] = await Promise.all([
      this.client.topic.count({ where }),
      this.client.topic.count({ where: baseWhere }),
      this.client.topic.count({ where: { AND: [baseWhere, phaseWhere("RECRUITING", query.now)] } }),
      this.client.topic.count({ where: { AND: [baseWhere, phaseWhere("CLOSING_SOON", query.now)] } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const topics = await this.client.topic.findMany({
      where,
      orderBy: query.sort === "DEADLINE" ? [{ recruitmentEndsAt: "asc" }, { id: "asc" }] : [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
      include: publicTopicInclude,
    });
    const ownApplications = query.viewerId && topics.length
      ? await this.client.topicApplication.findMany({
          where: { studentId: query.viewerId, topicId: { in: topics.map(({ id }) => id) } },
          select: { topicId: true, status: true },
        })
      : [];
    const ownStatusByTopic = new Map(ownApplications.map(({ topicId, status }) => [topicId, status]));
    return {
      items: topics.map((topic) => toPublicTopic(topic, ownStatusByTopic.get(topic.id) ?? null)),
      page,
      totalPages,
      total,
      counts: { ACTIVE: activeCount, RECRUITING: recruitingCount, CLOSING_SOON: closingSoonCount },
    };
  }

  async findPublished(id: string): Promise<PublicTopicSummary | null> {
    const topic = await this.client.topic.findFirst({
      where: { id, status: "PUBLISHED", program: { status: "OPEN" } },
      include: publicTopicInclude,
    });
    return topic ? toPublicTopic(topic) : null;
  }
}
