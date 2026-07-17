import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotification } from "@/modules/notification/infrastructure/notification-events";
import type {
  CreateTopicApplicationInput,
  CreateTopicApplicationResult,
  TopicApplicationCreator,
  TopicApplicationDecisionRepository,
  TopicApplicationLister,
  TopicApplicationSummary,
  ProfessorTopicApplicationLister,
  ProfessorTopicApplicationSummary,
  TopicApplicationDecisionState,
  TopicApplicationDecisionActor,
  AcceptTopicApplicationOutcome,
  RejectTopicApplicationOutcome,
} from "@/modules/topic-application/application/topic-application-ports";

const studentSummarySelect = {
  id: true,
  topicId: true,
  status: true,
  message: true,
  skills: true,
  desiredRole: true,
  availability: true,
  createdAt: true,
  decidedAt: true,
  topic: { select: { title: true, status: true, program: { select: { name: true, status: true } } } },
} satisfies Prisma.TopicApplicationSelect;

type StudentSummaryRow = Prisma.TopicApplicationGetPayload<{ select: typeof studentSummarySelect }>;

function toStudentSummary(application: StudentSummaryRow): TopicApplicationSummary {
  const { topic, ...record } = application;
  return { ...record, topicTitle: topic.title, topicStatus: topic.status, programName: topic.program.name, programStatus: topic.program.status };
}

export class PrismaTopicApplicationRepository
  implements
    TopicApplicationCreator,
    TopicApplicationLister,
    ProfessorTopicApplicationLister,
    TopicApplicationDecisionRepository
{
  constructor(private readonly client: PrismaClient) {}

  async createIfAvailable(
    input: CreateTopicApplicationInput,
  ): Promise<CreateTopicApplicationResult> {
    const id = randomUUID();
    return this.client.$transaction(async (transaction) => {
      const topics = await transaction.$queryRaw<
        Array<{ id: string; academicCycleId: string; capacity: number }>
      >(Prisma.sql`
        SELECT "topic"."id", "topic"."academicCycleId", "topic"."capacity"
        FROM "topic"
        JOIN "user" ON "user"."id" = ${input.studentId}
        WHERE "topic"."id" = ${input.topicId}
          AND "topic"."status" = 'PUBLISHED'
          AND "topic"."recruitmentStartsAt" <= ${input.appliedAt}
          AND "topic"."recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE OF "topic", "user"
      `);
      const topic = topics[0];
      if (!topic) {
        return { outcome: "TOPIC_UNAVAILABLE" } as const;
      }

      const membership = await transaction.teamMember.findUnique({
        where: {
          academicCycleId_studentId: {
            academicCycleId: topic.academicCycleId,
            studentId: input.studentId,
          },
        },
        select: { id: true },
      });
      if (membership) {
        return { outcome: "STUDENT_ALREADY_ASSIGNED" } as const;
      }

      const team = await transaction.team.findUnique({
        where: { topicId: input.topicId },
        select: { _count: { select: { members: true } } },
      });
      if ((team?._count.members ?? 0) >= topic.capacity) {
        return { outcome: "TOPIC_UNAVAILABLE" } as const;
      }

      const existing = await transaction.topicApplication.findUnique({
        where: {
          topicId_studentId: {
            topicId: input.topicId,
            studentId: input.studentId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return { outcome: "ALREADY_APPLIED" } as const;
      }

      await transaction.topicApplication.create({
        data: {
          id,
          topicId: input.topicId,
          studentId: input.studentId,
          message: input.message,
          skills: input.skills,
          desiredRole: input.desiredRole,
          availability: input.availability,
          status: "PENDING",
          decidedAt: null,
          createdAt: input.appliedAt,
          updatedAt: input.appliedAt,
        },
      });
      return { outcome: "CREATED", id } as const;
    });
  }

  async listByStudent(studentId: string, requestedPage: number, pageSize: number) {
    const [total, groupedCounts] = await Promise.all([
      this.client.topicApplication.count({ where: { studentId } }),
      this.client.topicApplication.groupBy({ by: ["status"], where: { studentId }, _count: { _all: true } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const applications = await this.client.topicApplication.findMany({
      where: { studentId },
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

  private async listForProfessor(
    where: Prisma.TopicApplicationWhereInput,
  ): Promise<ProfessorTopicApplicationSummary[]> {
    const applications = await this.client.topicApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        topic: { select: { title: true, authorId: true } },
        student: { select: { name: true, email: true } },
      },
    });

    applications.sort((left, right) => Number(right.status === "PENDING") - Number(left.status === "PENDING"));

    return applications.map(({ topic, student, ...application }) => ({
      id: application.id,
      topicId: application.topicId,
      status: application.status,
      message: application.message,
      skills: application.skills,
      desiredRole: application.desiredRole,
      availability: application.availability,
      createdAt: application.createdAt,
      topicTitle: topic.title,
      topicAuthorId: topic.authorId,
      studentId: application.studentId,
      studentName: student.name,
      studentEmail: student.email,
    }));
  }

  findDecisionState(
    id: string,
  ): Promise<TopicApplicationDecisionState | null> {
    return this.client.topicApplication.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        topic: { select: { authorId: true } },
      },
    }).then((application) =>
      application
        ? {
            id: application.id,
            status: application.status,
            topicAuthorId: application.topic.authorId,
          }
        : null,
    );
  }

  async accept(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<AcceptTopicApplicationOutcome> {
    try {
      return await this.acceptOnce(id, actor, decidedAt);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return isStudentCycleUniqueConflict(error)
          ? "STUDENT_ALREADY_ASSIGNED"
          : "CONFLICT";
      }
      if (error instanceof DecisionWriteConflictError) {
        return "CONFLICT";
      }
      throw error;
    }
  }

  async reject(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<RejectTopicApplicationOutcome> {
    return this.client.$transaction(async (transaction) => {
      const application = await transaction.topicApplication.findUnique({
        where: { id },
        include: { topic: { select: { authorId: true, title: true } }, recruitmentApplication: { include: { post: { include: { team: { select: { status: true } } } } } } },
      });
      if (!application || application.status !== "PENDING") return "CONFLICT";
      const recruiterAllowed = application.recruitmentApplication?.post.authorId === actor.id && application.recruitmentApplication.post.status === "OPEN" && application.recruitmentApplication.post.team.status === "FORMING";
      if (!actor.isAdmin && application.topic.authorId !== actor.id && !recruiterAllowed) return "FORBIDDEN";
      const result = await transaction.topicApplication.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      if (result.count !== 1) return "CONFLICT";
      await transaction.recruitmentApplication.updateMany({ where: { topicApplicationId: id, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      await createApplicationResultNotification(transaction, {
        applicationId: application.id,
        recipientId: application.studentId,
        topicTitle: application.topic.title,
        outcome: "REJECTED",
        createdAt: decidedAt,
      });
      return "REJECTED";
    });
  }

  private acceptOnce(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
  ): Promise<AcceptTopicApplicationOutcome> {
    return this.client.$transaction(
      async (transaction) => {
        const target = await transaction.topicApplication.findUnique({
          where: { id },
          select: { studentId: true, topicId: true },
        });
        if (!target) {
          return "CONFLICT";
        }

        const existingTeams = await transaction.$queryRaw<Array<{
          id: string;
          status: "FORMING" | "CONFIRMED" | "CLOSED";
        }>>(Prisma.sql`
          SELECT "id", "status"
          FROM "team"
          WHERE "topicId" = ${target.topicId}
          FOR UPDATE
        `);
        const existingTeam = existingTeams[0];
        if (existingTeam?.status === "CLOSED") return "CONFLICT";

        await transaction.$queryRaw(Prisma.sql`
          SELECT "topic"."id"
          FROM "topic"
          JOIN "user" ON "user"."id" = ${target.studentId}
          WHERE "topic"."id" = ${target.topicId}
          FOR UPDATE OF "topic", "user"
        `);

        const application = await transaction.topicApplication.findUnique({
          where: { id },
          include: {
            topic: {
              select: {
                id: true,
                title: true,
                authorId: true,
                academicCycleId: true,
                capacity: true,
                status: true,
              },
            },
            recruitmentApplication: { include: { post: { include: { team: { select: { status: true } } } } } },
          },
        });
        if (!application || application.status !== "PENDING") {
          return "CONFLICT";
        }
        const recruiterAllowed = application.topic.status === "PUBLISHED" && application.recruitmentApplication?.post.authorId === actor.id && application.recruitmentApplication.post.status === "OPEN" && application.recruitmentApplication.post.team.status === "FORMING";
        if (!actor.isAdmin && application.topic.authorId !== actor.id && !recruiterAllowed) {
          return "FORBIDDEN";
        }

        const existingMembership = await transaction.teamMember.findUnique({
          where: {
            academicCycleId_studentId: {
              academicCycleId: application.topic.academicCycleId,
              studentId: application.studentId,
            },
          },
          select: { id: true },
        });
        if (existingMembership) {
          return "STUDENT_ALREADY_ASSIGNED";
        }

        const memberCount = existingTeam
          ? await transaction.teamMember.count({
              where: { teamId: existingTeam.id },
            })
          : 0;
        if (memberCount >= application.topic.capacity) {
          return "CAPACITY_REACHED";
        }

        const team = await transaction.team.upsert({
          where: { topicId: application.topicId },
          update: {},
          create: {
            academicCycleId: application.topic.academicCycleId,
            topicId: application.topicId,
            professorId: application.topic.authorId,
            name: application.topic.title,
          },
          select: { id: true },
        });
        await transaction.teamMember.create({
          data: {
            teamId: team.id,
            academicCycleId: application.topic.academicCycleId,
            topicId: application.topicId,
            studentId: application.studentId,
            applicationId: application.id,
            joinedAt: decidedAt,
          },
        });
        const accepted = await transaction.topicApplication.updateMany({
          where: { id: application.id, status: "PENDING" },
          data: { status: "ACCEPTED", decidedAt },
        });
        if (accepted.count !== 1) {
          throw new DecisionWriteConflictError();
        }
        await transaction.recruitmentApplication.updateMany({ where: { topicApplicationId: application.id, status: "PENDING" }, data: { status: "ACCEPTED", decidedAt } });

        const reachesCapacity = memberCount + 1 === application.topic.capacity;
        const automaticallyRejected = await transaction.topicApplication.findMany({
          where: {
            id: { not: application.id },
            status: "PENDING",
            OR: [
              { studentId: application.studentId, topic: { academicCycleId: application.topic.academicCycleId } },
              ...(reachesCapacity ? [{ topicId: application.topicId }] : []),
            ],
          },
          select: { id: true, studentId: true, topic: { select: { title: true } } },
        });

        await transaction.topicApplication.updateMany({
          where: {
            id: { not: application.id },
            studentId: application.studentId,
            status: "PENDING",
            topic: {
              academicCycleId: application.topic.academicCycleId,
            },
          },
          data: { status: "REJECTED", decidedAt },
        });
        await transaction.recruitmentApplication.updateMany({
          where: { status: "PENDING", topicApplication: { studentId: application.studentId, status: "REJECTED", topic: { academicCycleId: application.topic.academicCycleId } } },
          data: { status: "REJECTED", decidedAt },
        });

        if (reachesCapacity) {
          await transaction.topicApplication.updateMany({
            where: {
              id: { not: application.id },
              topicId: application.topicId,
              status: "PENDING",
            },
            data: { status: "REJECTED", decidedAt },
          });
          await transaction.recruitmentApplication.updateMany({
            where: { status: "PENDING", topicApplication: { topicId: application.topicId, status: "REJECTED" } },
            data: { status: "REJECTED", decidedAt },
          });
          await transaction.recruitmentPost.updateMany({ where: { teamId: team.id, status: "OPEN" }, data: { status: "CLOSED" } });
        }

        await createApplicationResultNotification(transaction, {
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "ACCEPTED",
          createdAt: decidedAt,
        });
        for (const rejected of automaticallyRejected) {
          await createApplicationResultNotification(transaction, {
            applicationId: rejected.id,
            recipientId: rejected.studentId,
            topicTitle: rejected.topic.title,
            outcome: "REJECTED",
            createdAt: decidedAt,
          });
        }

        return "ACCEPTED";
      },
    );
  }
}

class DecisionWriteConflictError extends Error {}

function isStudentCycleUniqueConflict(
  error: Prisma.PrismaClientKnownRequestError,
): boolean {
  const target = error.meta?.target;
  return (
    Array.isArray(target) &&
    target.includes("academicCycleId") &&
    target.includes("studentId")
  );
}
