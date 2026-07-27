import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationReader,
  ProfessorTopicApplicationSummary,
  ProfessorTopicApplicationViewer,
  TopicApplicationLister,
  TopicApplicationSummary,
} from "@/modules/topic-application/application/topic-application-ports";

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
      program: { select: { name: true, status: true } },
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
  studentId: true,
  status: true,
  reviewComment: true,
  message: true,
  skills: true,
  desiredRole: true,
  availability: true,
  createdAt: true,
  topic: { select: { title: true, authorId: true } },
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

function toStudentSummary(application: StudentSummaryRow): TopicApplicationSummary {
  const { topic, student, group, ...record } = application;
  return {
    ...record,
    topicTitle: topic.title,
    topicStatus: topic.status,
    programName: topic.program.name,
    programStatus: topic.program.status,
    applicationKind: group?.kind ?? "INDIVIDUAL",
    teamMembers: group
      ? group.applications.map(({ studentId, participantRole, student: member }) => ({ studentId, name: member.name, email: member.email, role: participantRole }))
      : [{ studentId: application.studentId, name: student.name, email: student.email, role: "LEADER" }],
    answers: group?.answers.map(({ question, ...answer }) => ({ ...answer, ...question })) ?? [],
  };
}

function toProfessorSummary(application: ProfessorSummaryRow): ProfessorTopicApplicationSummary {
  const { topic, student, group, ...record } = application;
  return {
    ...record,
    topicTitle: topic.title,
    topicAuthorId: topic.authorId,
    studentName: student.name,
    studentEmail: student.email,
    applicationKind: group?.kind ?? "INDIVIDUAL",
    teamMembers: group
      ? group.applications.map(({ studentId, participantRole, student: member }) => ({ studentId, name: member.name, email: member.email, role: participantRole }))
      : [{ studentId: application.studentId, name: student.name, email: student.email, role: "LEADER" }],
    answers: group?.answers.map(({ question, ...answer }) => ({ ...answer, ...question })) ?? [],
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

  async listByTopicAuthor(
    authorId: string,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    return this.listForProfessor({ topic: { authorId } });
  }

  listAll(): Promise<ProfessorTopicApplicationSummary[]> {
    return this.listForProfessor({});
  }

  async findVisibleById(
    id: string,
    viewer: ProfessorTopicApplicationViewer,
  ): Promise<ProfessorTopicApplicationSummary | null> {
    const application = await this.client.topicApplication.findFirst({
      where: { id, ...(viewer.isAdmin ? {} : { topic: { authorId: viewer.actorId } }), OR: [{ groupId: null }, { participantRole: "LEADER" }] },
      select: professorSummarySelect,
    });
    return application ? toProfessorSummary(application) : null;
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

}
