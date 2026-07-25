import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotification } from "@/modules/notification/infrastructure/notification-events";
import type {
  AcceptTopicApplicationOutcome,
  TopicApplicationDecisionActor,
} from "@/modules/topic-application/application/topic-application-ports";
import { areActiveStudents } from "@/modules/topic-application/infrastructure/prisma-topic-application-utils";

export class PrismaTopicApplicationAcceptance {
  constructor(private readonly client: PrismaClient) {}

  async accept(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment = "",
  ): Promise<AcceptTopicApplicationOutcome> {
    for (let attempt = 1; attempt <= DECISION_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.acceptOnce(id, actor, decidedAt, reviewComment);
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
        if (isRetryableDecisionConflict(error)) {
          if (attempt < DECISION_TRANSACTION_ATTEMPTS) continue;
          return "CONFLICT";
        }
        throw error;
      }
    }
    return "CONFLICT";
  }

  private acceptOnce(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment: string,
  ): Promise<AcceptTopicApplicationOutcome> {
    return this.client.$transaction(
      async (transaction) => {
        const target = await transaction.topicApplication.findUnique({
          where: { id },
          select: { studentId: true, topicId: true, groupId: true },
        });
        if (!target) {
          return "CONFLICT";
        }
        if (target.groupId) {
          return this.acceptApplicationGroup(transaction, target.groupId, actor, decidedAt, reviewComment);
        }

        const lockedPrograms = await transaction.$queryRaw<Array<{
          status: "DRAFT" | "OPEN" | "CLOSED";
        }>>(Prisma.sql`
          SELECT "project_program"."status"
          FROM "project_program"
          JOIN "topic" ON "topic"."programId" = "project_program"."id"
          WHERE "topic"."id" = ${target.topicId}
          FOR UPDATE OF "project_program"
        `);
        const lockedTopics = await transaction.$queryRaw<Array<{ status: "DRAFT" | "PUBLISHED" | "CLOSED" }>>(Prisma.sql`
          SELECT "status" FROM "topic" WHERE "id" = ${target.topicId} FOR UPDATE
        `);
        if (lockedPrograms[0]?.status !== "OPEN" || lockedTopics[0]?.status !== "PUBLISHED") {
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
        if (existingTeam && existingTeam.status !== "FORMING") return "CONFLICT";

        const participants = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
          SELECT "id", "role", "isActive" FROM "user" WHERE "id" = ${target.studentId} FOR UPDATE
        `);
        if (!areActiveStudents(participants, 1)) return "CONFLICT";

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
          data: { status: "ACCEPTED", decidedAt, reviewComment },
        });
        if (accepted.count !== 1) {
          throw new DecisionWriteConflictError();
        }
        await transaction.recruitmentApplication.updateMany({ where: { topicApplicationId: application.id, status: "PENDING" }, data: { status: "ACCEPTED", decidedAt } });

        const reachesCapacity = memberCount + 1 === application.topic.capacity;
        const directlyConflicting = await transaction.topicApplication.findMany({
          where: {
            id: { not: application.id },
            status: "PENDING",
            OR: [
              { studentId: application.studentId, topic: { academicCycleId: application.topic.academicCycleId } },
              ...(reachesCapacity ? [{ topicId: application.topicId }] : []),
            ],
          },
          select: { id: true, groupId: true },
        });
        const conflictingIds = directlyConflicting.map(({ id: conflictingId }) => conflictingId);
        const conflictingGroupIds = directlyConflicting.flatMap(({ groupId }) => groupId ? [groupId] : []);
        const automaticallyRejected = conflictingIds.length || conflictingGroupIds.length
          ? await transaction.topicApplication.findMany({
              where: {
                status: "PENDING",
                OR: [{ id: { in: conflictingIds } }, { groupId: { in: conflictingGroupIds } }],
              },
              select: { id: true, studentId: true, topic: { select: { title: true } } },
            })
          : [];
        if (automaticallyRejected.length) {
          const rejectedIds = automaticallyRejected.map(({ id: rejectedId }) => rejectedId);
          await transaction.topicApplication.updateMany({
            where: { id: { in: rejectedIds }, status: "PENDING" },
            data: { status: "REJECTED", decidedAt },
          });
          await transaction.recruitmentApplication.updateMany({
            where: { topicApplicationId: { in: rejectedIds }, status: "PENDING" },
            data: { status: "REJECTED", decidedAt },
          });
        }

        if (reachesCapacity) {
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

  private async acceptApplicationGroup(
    transaction: Prisma.TransactionClient,
    groupId: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment: string,
  ): Promise<AcceptTopicApplicationOutcome> {
    const group = await transaction.topicApplicationGroup.findUnique({
      where: { id: groupId },
      select: { topicId: true },
    });
    if (!group) return "CONFLICT";
    const applications = await transaction.topicApplication.findMany({
      where: { groupId },
      orderBy: { participantRole: "asc" },
      select: { id: true, studentId: true, status: true },
    });
    const programRows = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
      SELECT "project_program"."status"
      FROM "project_program"
      JOIN "topic" ON "topic"."programId" = "project_program"."id"
      WHERE "topic"."id" = ${group.topicId}
      FOR UPDATE OF "project_program"
    `);
    const topicRows = await transaction.$queryRaw<Array<{
      id: string;
      title: string;
      authorId: string;
      academicCycleId: string;
      capacity: number;
      status: "DRAFT" | "PUBLISHED" | "CLOSED";
    }>>(Prisma.sql`
      SELECT "topic"."id", "topic"."title", "topic"."authorId", "topic"."academicCycleId", "topic"."capacity",
             "topic"."status"
      FROM "topic"
      WHERE "topic"."id" = ${group.topicId}
      FOR UPDATE
    `);
    const topic = topicRows[0];
    if (
      !topic ||
      topic.status !== "PUBLISHED" ||
      programRows[0]?.status !== "OPEN" ||
      applications.length === 0 ||
      applications.some(({ status }) => status !== "PENDING")
    ) {
      return "CONFLICT";
    }
    if (!actor.isAdmin && topic.authorId !== actor.id) return "FORBIDDEN";

    const studentIds = applications.map(({ studentId }) => studentId);
    const existingTeams = await transaction.$queryRaw<Array<{ id: string; status: "FORMING" | "CONFIRMED" | "CLOSED" }>>(Prisma.sql`
      SELECT "id", "status" FROM "team" WHERE "topicId" = ${group.topicId} FOR UPDATE
    `);
    if (existingTeams[0] && existingTeams[0].status !== "FORMING") return "CONFLICT";
    const participants = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; isActive: boolean }>>(Prisma.sql`
      SELECT "id", "role", "isActive" FROM "user" WHERE "id" IN (${Prisma.join(studentIds)}) ORDER BY "id" FOR UPDATE
    `);
    if (!areActiveStudents(participants, studentIds.length)) return "CONFLICT";

    const existingMemberships = await transaction.teamMember.count({
      where: { academicCycleId: topic.academicCycleId, studentId: { in: studentIds } },
    });
    if (existingMemberships > 0) return "STUDENT_ALREADY_ASSIGNED";

    const memberCount = existingTeams[0]
      ? await transaction.teamMember.count({ where: { teamId: existingTeams[0].id } })
      : 0;
    if (memberCount + applications.length > topic.capacity) return "CAPACITY_REACHED";

    const team = await transaction.team.upsert({
      where: { topicId: group.topicId },
      update: {},
      create: {
        academicCycleId: topic.academicCycleId,
        topicId: group.topicId,
        professorId: topic.authorId,
        name: topic.title,
      },
      select: { id: true },
    });
    await transaction.teamMember.createMany({
      data: applications.map((application) => ({
        teamId: team.id,
        academicCycleId: topic.academicCycleId,
        topicId: group.topicId,
        studentId: application.studentId,
        applicationId: application.id,
        joinedAt: decidedAt,
      })),
    });
    const accepted = await transaction.topicApplication.updateMany({
      where: { groupId, status: "PENDING" },
      data: { status: "ACCEPTED", decidedAt, reviewComment },
    });
    if (accepted.count !== applications.length) throw new DecisionWriteConflictError();

    const reachesCapacity = memberCount + applications.length === topic.capacity;
    const directlyConflicting = await transaction.topicApplication.findMany({
      where: {
        id: { notIn: applications.map(({ id }) => id) },
        status: "PENDING",
        OR: [
          { studentId: { in: studentIds }, topic: { academicCycleId: topic.academicCycleId } },
          ...(reachesCapacity ? [{ topicId: group.topicId }] : []),
        ],
      },
      select: { id: true, groupId: true },
    });
    const conflictingGroupIds = directlyConflicting.flatMap(({ groupId: conflictingGroupId }) => conflictingGroupId ? [conflictingGroupId] : []);
    const conflictingIds = directlyConflicting.map(({ id: conflictingId }) => conflictingId);
    const automaticallyRejected = conflictingIds.length || conflictingGroupIds.length
      ? await transaction.topicApplication.findMany({
          where: { status: "PENDING", OR: [{ id: { in: conflictingIds } }, { groupId: { in: conflictingGroupIds } }] },
          select: { id: true, studentId: true, topic: { select: { title: true } } },
        })
      : [];
    if (automaticallyRejected.length) {
      await transaction.topicApplication.updateMany({
        where: { id: { in: automaticallyRejected.map(({ id }) => id) }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { topicApplicationId: { in: automaticallyRejected.map(({ id }) => id) }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
    }
    if (reachesCapacity) {
      await transaction.recruitmentPost.updateMany({ where: { teamId: team.id, status: "OPEN" }, data: { status: "CLOSED" } });
    }

    for (const application of applications) {
      await createApplicationResultNotification(transaction, {
        applicationId: application.id,
        recipientId: application.studentId,
        topicTitle: topic.title,
        outcome: "ACCEPTED",
        createdAt: decidedAt,
      });
    }
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

const DECISION_TRANSACTION_ATTEMPTS = 3;

function isRetryableDecisionConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}
