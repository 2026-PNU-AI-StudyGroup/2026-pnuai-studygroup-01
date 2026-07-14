import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
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
          status: "PENDING",
          decidedAt: null,
          createdAt: input.appliedAt,
          updatedAt: input.appliedAt,
        },
      });
      return { outcome: "CREATED", id } as const;
    });
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
      orderBy: { createdAt: "asc" },
      include: {
        topic: { select: { title: true, authorId: true } },
        student: { select: { name: true, email: true } },
      },
    });

    return applications.map(({ topic, student, ...application }) => ({
      id: application.id,
      topicId: application.topicId,
      status: application.status,
      message: application.message,
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
    const result = await this.client.topicApplication.updateMany({
      where: {
        id,
        status: "PENDING",
        ...(actor.isAdmin ? {} : { topic: { authorId: actor.id } }),
      },
      data: { status: "REJECTED", decidedAt },
    });
    if (result.count === 1) {
      return "REJECTED";
    }

    const application = await this.client.topicApplication.findUnique({
      where: { id },
      select: { status: true, topic: { select: { authorId: true } } },
    });
    return application?.status === "PENDING" &&
      !actor.isAdmin &&
      application.topic.authorId !== actor.id
      ? "FORBIDDEN"
      : "CONFLICT";
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
              },
            },
          },
        });
        if (!application || application.status !== "PENDING") {
          return "CONFLICT";
        }
        if (!actor.isAdmin && application.topic.authorId !== actor.id) {
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

        if (memberCount + 1 === application.topic.capacity) {
          await transaction.topicApplication.updateMany({
            where: {
              id: { not: application.id },
              topicId: application.topicId,
              status: "PENDING",
            },
            data: { status: "REJECTED", decidedAt },
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
