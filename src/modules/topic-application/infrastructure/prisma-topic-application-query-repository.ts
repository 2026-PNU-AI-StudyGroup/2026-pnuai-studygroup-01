import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { topicSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import type {
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationListItem,
  ProfessorTopicApplicationPage,
  ProfessorTopicApplicationQuery,
  ProfessorTopicApplicationReader,
  ProfessorTopicApplicationSummary,
  TopicApplicationLister,
  TopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";
import { effectiveProjectStatus } from "@/modules/topic/domain/project-lifecycle";

const studentSummarySelect = {
  id: true,
  topicId: true,
  studentId: true,
  status: true,
  reviewComment: true,
  message: true,
  skills: true,
  desiredRole: true,
  availability: true,
  createdAt: true,
  decidedAt: true,
  topic: {
    select: {
      title: true,
      status: true,
      program: { select: { name: true, isPublic: true, endsAt: true } },
      projectTeam: { select: { confirmedAt: true } },
    },
  },
  student: { select: { name: true, email: true } },
  group: {
    select: {
      kind: true,
      applications: {
        orderBy: { participantRole: "asc" as const },
        select: { studentId: true, participantRole: true, student: { select: { name: true, email: true } } },
      },
      answers: {
        orderBy: { question: { position: "asc" as const } },
        select: { questionId: true, value: true, question: { select: { label: true, required: true, maxLength: true } } },
      },
    },
  },
} satisfies Prisma.TopicApplicationSelect;

type StudentSummaryRow = Prisma.TopicApplicationGetPayload<{ select: typeof studentSummarySelect }>;

const professorSummarySelect = {
  id: true,
  topicId: true,
  groupId: true,
  studentId: true,
  status: true,
  reviewComment: true,
  message: true,
  skills: true,
  desiredRole: true,
  availability: true,
  createdAt: true,
  decidedAt: true,
  decidedBy: { select: { name: true } },
  topic: {
    select: {
      title: true,
      managerId: true,
      programId: true,
      capacity: true,
      assistants: { select: { userId: true } },
    },
  },
  student: { select: { name: true, email: true } },
  group: {
    select: {
      kind: true,
      applications: {
        orderBy: { participantRole: "asc" as const },
        select: { studentId: true, participantRole: true, student: { select: { name: true, email: true } } },
      },
      answers: {
        orderBy: { question: { position: "asc" as const } },
        select: { questionId: true, value: true, question: { select: { label: true, required: true, maxLength: true } } },
      },
    },
  },
} satisfies Prisma.TopicApplicationSelect;

type ProfessorSummaryRow = Prisma.TopicApplicationGetPayload<{ select: typeof professorSummarySelect }>;

const professorListItemSelect = {
  id: true,
  topicId: true,
  status: true,
  createdAt: true,
  topic: { select: { title: true } },
  student: { select: { name: true } },
  group: {
    select: {
      kind: true,
      _count: { select: { applications: true } },
    },
  },
} satisfies Prisma.TopicApplicationSelect;

type ProfessorListItemRow = Prisma.TopicApplicationGetPayload<{ select: typeof professorListItemSelect }>;

function toStudentSummary(application: StudentSummaryRow): TopicApplicationSummary {
  const { topic, student, group, ...record } = application;
  return {
    ...record,
    topicTitle: topic.title,
    topicStatus: (() => {
      const status = effectiveProjectStatus({ status: topic.status, programEndsAt: topic.program.endsAt, confirmedAt: topic.projectTeam?.confirmedAt ?? null });
      return status === "FORMING" || status === "IN_PROGRESS" ? "ACTIVE" : status;
    })(),
    programName: topic.program.name,
    programStatus: topic.program.endsAt <= new Date() ? "CLOSED" : topic.program.isPublic ? "OPEN" : "DRAFT",
    applicationKind: group?.kind ?? "INDIVIDUAL",
    teamMembers: group
      ? group.applications.map(({ studentId, participantRole, student: member }) => ({ studentId, name: member.name, email: member.email, role: participantRole }))
      : [{ studentId: application.studentId, name: student.name, email: student.email, role: "LEADER" }],
    answers: group?.answers.map(({ question, ...answer }) => ({ ...answer, ...question })) ?? [],
  };
}

function toProfessorSummary(application: ProfessorSummaryRow): ProfessorTopicApplicationSummary {
  const { topic, student, group, decidedBy, ...record } = application;
  return {
    ...record,
    topicTitle: topic.title,
    topicManagerId: topic.managerId,
    topicAssistantIds: topic.assistants.map(({ userId }) => userId),
    studentName: student.name,
    studentEmail: student.email,
    decidedByName: decidedBy?.name ?? null,
    decisionImpact: null,
    applicationKind: group?.kind ?? "INDIVIDUAL",
    teamMembers: group
      ? group.applications.map(({ studentId, participantRole, student: member }) => ({ studentId, name: member.name, email: member.email, role: participantRole }))
      : [{ studentId: application.studentId, name: student.name, email: student.email, role: "LEADER" }],
    answers: group?.answers.map(({ question, ...answer }) => ({ ...answer, ...question })) ?? [],
  };
}

function toProfessorListItem(application: ProfessorListItemRow): ProfessorTopicApplicationListItem {
  return {
    id: application.id,
    topicId: application.topicId,
    topicTitle: application.topic.title,
    status: application.status,
    studentName: application.student.name,
    applicationKind: application.group?.kind ?? "INDIVIDUAL",
    teamMemberCount: application.group?._count.applications ?? 1,
    createdAt: application.createdAt,
  };
}

export class PrismaTopicApplicationQueryRepository implements
  TopicApplicationLister,
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationReader
{
  constructor(private readonly client: PrismaClient) {}

  async listByStudent(
    studentId: string,
    requestedPage: number,
    pageSize: number,
    status?: "PENDING" | "REJECTED",
  ) {
    const pageFilter = { studentId, ...(status ? { status } : {}) };
    const [total, groupedCounts] = await Promise.all([
      this.client.topicApplication.count({ where: pageFilter }),
      this.client.topicApplication.groupBy({ by: ["status"], where: { studentId }, _count: { _all: true } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const applications = await this.client.topicApplication.findMany({
      where: pageFilter,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: studentSummarySelect,
    });
    return {
      items: applications.map(toStudentSummary),
      page,
      totalPages,
      total,
      counts: {
        PENDING: groupedCounts.find(({ status }) => status === "PENDING")?._count._all ?? 0,
        ACCEPTED: groupedCounts.find(({ status }) => status === "ACCEPTED")?._count._all ?? 0,
        REJECTED: groupedCounts.find(({ status }) => status === "REJECTED")?._count._all ?? 0,
        WITHDRAWN: groupedCounts.find(({ status }) => status === "WITHDRAWN")?._count._all ?? 0,
      },
    };
  }

  async findByStudentAndTopic(studentId: string, topicId: string): Promise<TopicApplicationSummary | null> {
    const application = await this.client.topicApplication.findUnique({
      where: { topicId_studentId: { topicId, studentId } },
      select: studentSummarySelect,
    });
    return application ? toStudentSummary(application) : null;
  }

  async listByTopicManager(
    managerId: string,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    return this.listForProfessor({ topic: { managerId } });
  }

  listAll(): Promise<ProfessorTopicApplicationSummary[]> {
    return this.listForProfessor({});
  }

  listForActor(
    actor: CurrentActor,
    query: ProfessorTopicApplicationQuery,
  ): Promise<ProfessorTopicApplicationPage> {
    const visibility = {
      topic: topicSupervisorWhere(actor),
    } satisfies Prisma.TopicApplicationWhereInput;
    return this.listPageForProfessor(visibility, query);
  }

  async findVisibleById(
    id: string,
    actor: CurrentActor,
  ): Promise<ProfessorTopicApplicationSummary | null> {
    const application = await this.client.topicApplication.findFirst({
      where: {
        id,
        topic: topicSupervisorWhere(actor),
        OR: [{ groupId: null }, { participantRole: "LEADER" }],
      },
      select: professorSummarySelect,
    });
    if (!application) return null;
    const summary = toProfessorSummary(application);
    if (application.status !== "PENDING") return summary;

    const acceptedApplicationIds = application.group
      ? application.group.applications.map(({ studentId }) => studentId)
      : [application.studentId];
    const selectedApplicationIds = application.group
      ? await this.client.topicApplication.findMany({
          where: { groupId: application.groupId ?? undefined },
          select: { id: true },
        }).then((items) => items.map(({ id: applicationId }) => applicationId))
      : [application.id];
    const currentMemberCount = await this.client.projectTeamMembership.count({
      where: { projectTeam: { projectId: application.topicId }, endedAt: null },
    });
    const closesRecruitment = currentMemberCount + acceptedApplicationIds.length >= application.topic.capacity;
    const directConflicts = closesRecruitment ? await this.client.topicApplication.findMany({
      where: {
        id: { notIn: selectedApplicationIds },
        status: "PENDING",
        topicId: application.topicId,
      },
      select: { id: true, groupId: true },
    }) : [];
    const conflictIds = directConflicts.map(({ id: conflictId }) => conflictId);
    const conflictGroupIds = directConflicts.flatMap(({ groupId }) => groupId ? [groupId] : []);
    const automaticallyRejectedApplicationCount = directConflicts.length
      ? await this.client.topicApplication.count({
          where: {
            status: "PENDING",
            OR: [
              { id: { in: conflictIds } },
              { groupId: { in: conflictGroupIds } },
            ],
          },
        })
      : 0;
    return {
      ...summary,
      decisionImpact: {
        acceptedMemberCount: acceptedApplicationIds.length,
        currentMemberCount,
        capacity: application.topic.capacity,
        automaticallyRejectedApplicationCount,
        closesRecruitment,
      },
    };
  }

  private async listForProfessor(
    where: Prisma.TopicApplicationWhereInput,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    const applications = await this.client.topicApplication.findMany({
      where: { AND: [where, { OR: [{ groupId: null }, { participantRole: "LEADER" }] }] },
      orderBy: { createdAt: "desc" },
      select: professorSummarySelect,
    });

    applications.sort((left, right) => Number(right.status === "PENDING") - Number(left.status === "PENDING"));

    return applications.map(toProfessorSummary);
  }

  private async listPageForProfessor(
    visibility: Prisma.TopicApplicationWhereInput,
    query: ProfessorTopicApplicationQuery,
  ): Promise<ProfessorTopicApplicationPage> {
    const escapedQuery = query.query.replace(/[\\%_]/g, "\\$&");
    const search: Prisma.TopicApplicationWhereInput = escapedQuery ? {
      OR: [
        { topic: { title: { contains: escapedQuery, mode: "insensitive" } } },
        { student: { name: { contains: escapedQuery, mode: "insensitive" } } },
        { student: { email: { contains: escapedQuery, mode: "insensitive" } } },
      ],
    } : {};
    const baseWhere: Prisma.TopicApplicationWhereInput = {
      AND: [
        visibility,
        { OR: [{ groupId: null }, { participantRole: "LEADER" }] },
        search,
      ],
    };
    const where: Prisma.TopicApplicationWhereInput = {
      AND: [baseWhere, query.status ? { status: query.status } : {}],
    };
    const [total, groupedCounts] = await Promise.all([
      this.client.topicApplication.count({ where }),
      this.client.topicApplication.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const applications = await this.client.topicApplication.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
      select: professorListItemSelect,
    });

    return {
      items: applications.map(toProfessorListItem),
      page,
      totalPages,
      total,
      counts: {
        PENDING: groupedCounts.find(({ status }) => status === "PENDING")?._count._all ?? 0,
        ACCEPTED: groupedCounts.find(({ status }) => status === "ACCEPTED")?._count._all ?? 0,
        REJECTED: groupedCounts.find(({ status }) => status === "REJECTED")?._count._all ?? 0,
        WITHDRAWN: groupedCounts.find(({ status }) => status === "WITHDRAWN")?._count._all ?? 0,
      },
    };
  }

}
