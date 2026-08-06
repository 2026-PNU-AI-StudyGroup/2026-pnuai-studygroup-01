import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ManagedTopicReader,
  ManagedTopicPage,
  ManagedTopicSummary,
  PublicTopicLister,
  PublicTopicPage,
  PublicTopicPhase,
  PublicTopicQuery,
  PublicTopicSummary,
  TopicLister,
} from "@/modules/topic/application/topic-ports";
import { topicSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import { getProgramStartYear } from "@/modules/project-program/domain/project-program-policy";

const publicTopicInclude = {
  author: { select: { name: true, role: true } },
  manager: { select: { name: true } },
  program: { select: { name: true, category: true, status: true, advisorEnabled: true, startsAt: true } },
  team: { select: { _count: { select: { members: true } } } },
  applicationQuestions: {
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      label: true,
      maxLength: true,
      required: true,
      position: true,
    },
  },
} satisfies Prisma.TopicInclude;

const managedTopicSelect = {
  id: true,
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
  recruitmentEnabled: true,
  applicationQuestions: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      label: true,
      maxLength: true,
      required: true,
      position: true,
    },
  },
  capacity: true,
  recruitmentStartsAt: true,
  recruitmentEndsAt: true,
  executionStartsAt: true,
  executionEndsAt: true,
  submissionStartsAt: true,
  submissionEndsAt: true,
  status: true,
  publishedAt: true,
  _count: {
    select: {
      applications: { where: { status: "PENDING" } },
    },
  },
  team: {
    select: {
      _count: {
        select: {
          recruitmentPosts: { where: { status: "OPEN" } },
        },
      },
    },
  },
  program: { select: { name: true, category: true, status: true, advisorEnabled: true } },
} satisfies Prisma.TopicSelect;

type ManagedTopicRow = Prisma.TopicGetPayload<{
  select: typeof managedTopicSelect;
}>;
type PublicTopicRow = Prisma.TopicGetPayload<{
  include: typeof publicTopicInclude;
}>;

export class PrismaTopicQueryRepository
  implements TopicLister, ManagedTopicReader, PublicTopicLister
{
  constructor(private readonly client: PrismaClient) {}

  listByManager(managerId: string): Promise<ManagedTopicSummary[]> {
    return this.list({ managerId });
  }

  listAll(): Promise<ManagedTopicSummary[]> {
    return this.list({});
  }

  listForActor(actor: CurrentActor): Promise<ManagedTopicSummary[]> {
    return this.list(topicSupervisorWhere(actor));
  }

  async listPageForActor(actor: CurrentActor, requestedPage: number, pageSize: number): Promise<ManagedTopicPage> {
    const where = topicSupervisorWhere(actor);
    const total = await this.client.topic.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const topics = await this.client.topic.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: managedTopicSelect,
    });
    return { items: topics.map(toTopicSummary), page, totalPages, total };
  }

  private list(where: Prisma.TopicWhereInput): Promise<ManagedTopicSummary[]> {
    return this.client.topic.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: managedTopicSelect,
    }).then((topics) => topics.map(toTopicSummary));
  }

  async findManaged(
    id: string,
    actor: CurrentActor,
  ): Promise<ManagedTopicSummary | null> {
    const topic = await this.client.topic.findFirst({
      where: {
        id,
        ...topicSupervisorWhere(actor),
      },
      select: managedTopicSelect,
    });
    return topic ? toTopicSummary(topic) : null;
  }

  async listPublished(query: PublicTopicQuery): Promise<PublicTopicPage> {
    const escapedQuery = query.query.toLowerCase().replace(/[\\%_]/g, "\\$&");
    const skillTopicIds = query.query
      ? await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id" FROM "topic"
          WHERE lower(array_to_string("requiredSkills", ' ')) LIKE ${`%${escapedQuery}%`} ESCAPE '\'
             OR lower(array_to_string("preferredSkills", ' ')) LIKE ${`%${escapedQuery}%`} ESCAPE '\'
        `)
      : [];
    const search: Prisma.TopicWhereInput = query.query ? { OR: [
      { title: { contains: escapedQuery, mode: "insensitive" } },
      { description: { contains: escapedQuery, mode: "insensitive" } },
      { id: { in: skillTopicIds.map(({ id }) => id) } },
      {
        manager: { name: { contains: escapedQuery, mode: "insensitive" } },
        program: { advisorEnabled: true },
      },
      { program: { name: { contains: escapedQuery, mode: "insensitive" } } },
    ] } : {};
    const baseWhere: Prisma.TopicWhereInput = {
      status: "PUBLISHED",
      programId: query.programId,
      program: { status: "OPEN" },
      ...search,
    };
    const where: Prisma.TopicWhereInput = {
      AND: [baseWhere, phaseWhere(query.phase, query.now)],
    };
    const [total, activeCount, recruitingCount, closingSoonCount] =
      await Promise.all([
        this.client.topic.count({ where }),
        this.client.topic.count({ where: baseWhere }),
        this.client.topic.count({
          where: {
            AND: [baseWhere, phaseWhere("RECRUITING", query.now)],
          },
        }),
        this.client.topic.count({
          where: {
            AND: [baseWhere, phaseWhere("CLOSING_SOON", query.now)],
          },
        }),
      ]);
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const topics = await this.client.topic.findMany({
      where,
      orderBy: query.sort === "DEADLINE"
        ? [{ recruitmentEndsAt: "asc" }, { id: "asc" }]
        : [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
      include: publicTopicInclude,
    });
    const ownApplications = query.viewerId && topics.length
      ? await this.client.topicApplication.findMany({
          where: {
            studentId: query.viewerId,
            topicId: { in: topics.map(({ id }) => id) },
          },
          select: { topicId: true, status: true },
        })
      : [];
    const ownStatusByTopic = new Map(
      ownApplications.map(({ topicId, status }) => [topicId, status]),
    );
    return {
      items: topics.map((topic) =>
        toPublicTopic(topic, ownStatusByTopic.get(topic.id) ?? null)),
      page,
      totalPages,
      total,
      counts: {
        ACTIVE: activeCount,
        RECRUITING: recruitingCount,
        CLOSING_SOON: closingSoonCount,
      },
    };
  }

  async findPublished(id: string): Promise<PublicTopicSummary | null> {
    const topic = await this.client.topic.findFirst({
      where: {
        id,
        status: "PUBLISHED",
        program: { status: "OPEN" },
      },
      include: publicTopicInclude,
    });
    return topic ? toPublicTopic(topic) : null;
  }
}

function toTopicSummary(
  { author, program, _count, team, ...topic }: ManagedTopicRow,
): ManagedTopicSummary {
  return {
    ...topic,
    authorName: author.name,
    authorRole: author.role,
    programName: program.name,
    programCategory: program.category,
    programStatus: program.status,
    advisorEnabled: program.advisorEnabled,
    pendingApplicationCount: _count.applications,
    openRecruitmentPostCount: team?._count.recruitmentPosts ?? 0,
  };
}

function toPublicTopic(
  { author, manager, program, team, ...topic }: PublicTopicRow,
  ownApplicationStatus: PublicTopicSummary["ownApplicationStatus"] = null,
): PublicTopicSummary {
  return {
    ...topic,
    authorName: author.name,
    authorRole: author.role,
    professorName: program.advisorEnabled ? manager?.name ?? null : null,
    startYear: getProgramStartYear(program.startsAt),
    programName: program.name,
    programCategory: program.category,
    programStatus: program.status,
    advisorEnabled: program.advisorEnabled,
    memberCount: team?._count.members ?? 0,
    ownApplicationStatus,
  };
}

function phaseWhere(
  phase: PublicTopicPhase,
  now: Date,
): Prisma.TopicWhereInput {
  if (phase === "RECRUITING") {
    return {
      recruitmentEnabled: true,
      recruitmentStartsAt: { lte: now },
      recruitmentEndsAt: { gt: now },
    };
  }
  if (phase === "CLOSING_SOON") {
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000);
    return {
      recruitmentEnabled: true,
      recruitmentStartsAt: { lte: now },
      recruitmentEndsAt: { gt: now, lte: sevenDaysLater },
    };
  }
  return {};
}
