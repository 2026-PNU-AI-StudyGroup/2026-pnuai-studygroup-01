import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ManagedTopicReader,
  ManagedTopicPage,
  ManagedTopicSummary,
  AdminTopicPreviewLister,
  AdminTopicPreviewQuery,
  PublicTopicLister,
  PublicTopicPage,
  PublicTopicQuery,
  PublicTopicSummary,
  TopicLister,
} from "@/modules/topic/application/topic-ports";
import { topicSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import { getProgramStartYear } from "@/modules/project-program/domain/project-program-policy";
import { effectiveProjectStatus } from "@/modules/topic/domain/project-lifecycle";

const publicTopicInclude = {
  author: { select: { name: true, role: true } },
  manager: { select: { name: true } },
  division: { select: { id: true, name: true } },
  program: { select: { name: true, category: true, isPublic: true, endsAt: true, advisorEnabled: true, studentProjectCreationEnabled: true, projectTeamMinSize: true, projectTeamMaxSize: true, startsAt: true, recruitmentStartsAt: true, recruitmentEndsAt: true, executionStartsAt: true, executionEndsAt: true, votingPolicy: { select: { startsAt: true, endsAt: true } } } },
  projectTeam: { select: { confirmedAt: true, showcaseIntro: true, _count: { select: { memberships: { where: { endedAt: null } } } }, memberships: { where: { endedAt: null }, orderBy: { joinedAt: "asc" as const }, select: { role: true, user: { select: { name: true } } } }, artifacts: { orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }], select: { id: true, type: true, title: true, fileId: true, externalUrl: true, position: true } } } },
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
  managerId: true,
  author: { select: { name: true, role: true } },
  title: true,
  description: true,
  programId: true,
  divisionId: true,
  division: { select: { name: true } },
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
  status: true,
  publishedAt: true,
  _count: {
    select: {
      applications: { where: { status: "PENDING" } },
    },
  },
  projectTeam: {
    select: {
      confirmedAt: true,
      _count: {
        select: {
          recruitmentPosts: { where: { status: "OPEN" } },
        },
      },
    },
  },
  program: { select: { name: true, category: true, isPublic: true, endsAt: true, advisorEnabled: true, studentProjectCreationEnabled: true, projectTeamMinSize: true, projectTeamMaxSize: true, recruitmentStartsAt: true, recruitmentEndsAt: true, executionStartsAt: true, executionEndsAt: true, votingPolicy: { select: { startsAt: true, endsAt: true } } } },
} satisfies Prisma.TopicSelect;

type ManagedTopicRow = Prisma.TopicGetPayload<{
  select: typeof managedTopicSelect;
}>;
type PublicTopicRow = Prisma.TopicGetPayload<{
  include: typeof publicTopicInclude;
}>;

export class PrismaTopicQueryRepository
  implements TopicLister, ManagedTopicReader, PublicTopicLister, AdminTopicPreviewLister
{
  constructor(
    private readonly client: PrismaClient,
    private readonly audience: "STUDENT" | "FACULTY" | "ADMIN" = "STUDENT",
  ) {}

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

  listPublished(query: PublicTopicQuery): Promise<PublicTopicPage> {
    return this.listPublishedMatching(query, true);
  }

  listPublishedForAdmin(query: AdminTopicPreviewQuery): Promise<PublicTopicPage> {
    return this.listPublishedMatching(query, false);
  }

  private async listPublishedMatching(query: PublicTopicQuery | AdminTopicPreviewQuery, publicProgramsOnly: boolean): Promise<PublicTopicPage> {
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
    const divisionWhere: Prisma.TopicWhereInput = query.divisionId === "UNASSIGNED" ? { divisionId: null } : query.divisionId ? { divisionId: query.divisionId } : {};
    const topicIdsWhere: Prisma.TopicWhereInput = "topicIds" in query && query.topicIds !== undefined
      ? { id: { in: query.topicIds } }
      : {};
    const visibilityWhere: Prisma.TopicWhereInput = publicProgramsOnly
      ? {
          status: "ACTIVE",
          programId: query.programId,
          program: programVisibilityWhere(this.audience),
        }
      : {
          programId: query.programId,
          OR: [
            { status: "ACTIVE" },
            { program: { endsAt: { lte: query.now } } },
          ],
        };
    const baseWhere: Prisma.TopicWhereInput = { AND: [
      visibilityWhere,
      topicIdsWhere,
      divisionWhere,
      search,
      publicProgramsOnly ? { OR: [
        { program: { endsAt: { gt: query.now } } },
        { projectTeam: { confirmedAt: { not: null } } },
      ] } : {},
    ] };
    const where = baseWhere;
    const total = await this.client.topic.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const topics = await this.client.topic.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
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
        toPublicTopic(topic, ownStatusByTopic.get(topic.id) ?? null, this.audience)),
      page,
      totalPages,
      total,
    };
  }

  async findPublished(id: string): Promise<PublicTopicSummary | null> {
    const topic = await this.client.topic.findFirst({
      where: {
        id,
        status: "ACTIVE",
        program: programVisibilityWhere(this.audience),
        OR: [
          { program: { endsAt: { gt: new Date() } } },
          { projectTeam: { confirmedAt: { not: null } } },
        ],
      },
      include: publicTopicInclude,
    });
    return topic ? toPublicTopic(topic, null, this.audience) : null;
  }

  async findPublishedForAdmin(id: string): Promise<PublicTopicSummary | null> {
    const topic = await this.client.topic.findFirst({
      where: {
        id,
        OR: [
          { status: "ACTIVE" },
          { program: { endsAt: { lte: new Date() } } },
        ],
      },
      include: publicTopicInclude,
    });
    return topic ? toPublicTopic(topic, null, this.audience) : null;
  }
}

function toTopicSummary(
  { author, program, division, _count, projectTeam, ...topic }: ManagedTopicRow,
): ManagedTopicSummary {
  return {
    ...topic,
    authorName: author.name,
    // 주제 작성자는 학생·교수·관리자만 화면에서 생성할 수 있어 ADVISOR가 올 수 없다.
    authorRole: author.role as "STUDENT" | "PROFESSOR" | "ADMIN",
    programName: program.name,
    programCategory: program.category,
    effectiveStatus: effectiveProjectStatus({ status: topic.status, programEndsAt: program.endsAt, confirmedAt: projectTeam?.confirmedAt ?? null }),
    divisionName: division?.name ?? null,
    programStatus: program.endsAt <= new Date() ? "CLOSED" : program.isPublic ? "OPEN" : "DRAFT",
    advisorEnabled: program.advisorEnabled,
    studentProjectCreationEnabled: program.studentProjectCreationEnabled,
    projectTeamMinSize: program.projectTeamMinSize,
    projectTeamMaxSize: program.projectTeamMaxSize,
    programRecruitmentStartsAt: program.recruitmentStartsAt,
    programRecruitmentEndsAt: program.recruitmentEndsAt,
    programExecutionStartsAt: program.executionStartsAt,
    programExecutionEndsAt: program.executionEndsAt,
    programVotingStartsAt: program.votingPolicy?.startsAt ?? null,
    programVotingEndsAt: program.votingPolicy?.endsAt ?? null,
    pendingApplicationCount: _count.applications,
    openRecruitmentPostCount: projectTeam?._count.recruitmentPosts ?? 0,
  };
}

function toPublicTopic(
  { author, manager, program, division, projectTeam, ...topic }: PublicTopicRow,
  ownApplicationStatus: PublicTopicSummary["ownApplicationStatus"] = null,
  audience: "STUDENT" | "FACULTY" | "ADMIN" = "STUDENT",
): PublicTopicSummary {
  return {
    ...topic,
    authorName: author.name,
    // 주제 작성자는 학생·교수·관리자만 화면에서 생성할 수 있어 ADVISOR가 올 수 없다.
    authorRole: author.role as "STUDENT" | "PROFESSOR" | "ADMIN",
    professorName: program.advisorEnabled ? manager?.name ?? null : null,
    startYear: getProgramStartYear(program.startsAt),
    programName: program.name,
    programCategory: program.category,
    effectiveStatus: effectiveProjectStatus({ status: topic.status, programEndsAt: program.endsAt, confirmedAt: projectTeam?.confirmedAt ?? null }),
    divisionName: division?.name ?? null,
    programStatus: program.endsAt <= new Date() ? "CLOSED" : isProgramVisibleTo(program, audience) ? "OPEN" : "DRAFT",
    advisorEnabled: program.advisorEnabled,
    studentProjectCreationEnabled: program.studentProjectCreationEnabled,
    projectTeamMinSize: program.projectTeamMinSize,
    projectTeamMaxSize: program.projectTeamMaxSize,
    programRecruitmentStartsAt: program.recruitmentStartsAt,
    programRecruitmentEndsAt: program.recruitmentEndsAt,
    programExecutionStartsAt: program.executionStartsAt,
    programExecutionEndsAt: program.executionEndsAt,
    programVotingStartsAt: program.votingPolicy?.startsAt ?? null,
    programVotingEndsAt: program.votingPolicy?.endsAt ?? null,
    showcaseIntro: projectTeam?.showcaseIntro ?? null,
    artifacts: (projectTeam?.artifacts ?? []).map(({ fileId, externalUrl, ...artifact }) => ({
      ...artifact,
      fileId: fileId ?? undefined,
      externalUrl: externalUrl ?? undefined,
    })),
    memberCount: projectTeam?._count.memberships ?? 0,
    teamMembers: projectTeam?.memberships.map(({ role, user }) => ({ name: user.name, role })) ?? [],
    ownApplicationStatus,
  };
}

function programVisibilityWhere(audience: "STUDENT" | "FACULTY" | "ADMIN"): Prisma.ProjectProgramWhereInput {
  if (audience === "ADMIN") return {};
  return { isPublic: true };
}

function isProgramVisibleTo(
  program: { isPublic: boolean },
  audience: "STUDENT" | "FACULTY" | "ADMIN",
) {
  return audience === "ADMIN" || program.isPublic;
}
