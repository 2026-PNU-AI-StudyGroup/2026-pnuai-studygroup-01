import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotification } from "@/modules/notification/infrastructure/notification-events";
import { assignProgramDeliverablesToTeam } from "@/modules/report/infrastructure/program-deliverable-assignment";
import { roleForAcceptedTeamMember } from "@/modules/team/domain/team-leadership";
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
          return isActiveProjectMembershipUniqueConflict(error)
            ? "STUDENT_ALREADY_IN_PROJECT"
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
          endsAt: Date;
          studentProjectCreationEnabled: boolean;
        }>>(Prisma.sql`
          SELECT "project_program"."endsAt", "project_program"."studentProjectCreationEnabled"
          FROM "project_program"
          JOIN "topic" ON "topic"."programId" = "project_program"."id"
          WHERE "topic"."id" = ${target.topicId}
          FOR UPDATE OF "project_program"
        `);
        const lockedTopics = await transaction.$queryRaw<Array<{ status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE" }>>(Prisma.sql`
          SELECT "status" FROM "topic" WHERE "id" = ${target.topicId} FOR UPDATE
        `);
        if (!lockedPrograms[0] || lockedPrograms[0].endsAt <= decidedAt || lockedPrograms[0].studentProjectCreationEnabled || lockedTopics[0]?.status !== "ACTIVE") {
          return "CONFLICT";
        }

        const existingTeams = await transaction.$queryRaw<Array<{
          id: string;
          confirmedAt: Date | null;
        }>>(Prisma.sql`
          SELECT "id", "confirmedAt"
          FROM "project_team"
          WHERE "projectId" = ${target.topicId}
          FOR UPDATE
        `);
        const existingTeam = existingTeams[0];
        if (existingTeam?.confirmedAt) return "CONFLICT";

        const participants = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN" }>>(Prisma.sql`
          SELECT "id", "role", "accountStatus" FROM "user" WHERE "id" = ${target.studentId} FOR UPDATE
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
                managerId: true,
                assistants: { select: { userId: true } },
                programId: true,
                capacity: true,
                status: true,
              },
            },
            recruitmentApplication: { include: { post: { include: { projectTeam: { select: { confirmedAt: true } } } } } },
          },
        });
        if (!application || application.status !== "PENDING") {
          return "CONFLICT";
        }
        if (!application.topic.managerId) return "CONFLICT";
        const recruiterAllowed = application.topic.status === "ACTIVE" && application.recruitmentApplication?.post.authorId === actor.id && application.recruitmentApplication.post.status === "OPEN" && !application.recruitmentApplication.post.projectTeam.confirmedAt;
        const assistantAllowed = application.topic.assistants.some(
          ({ userId }) => userId === actor.id,
        );
        if (!actor.isAdmin && application.topic.managerId !== actor.id && !assistantAllowed && !recruiterAllowed) {
          return "FORBIDDEN";
        }

        const existingMembership = await transaction.projectTeamMembership.findFirst({
          where: {
            userId: application.studentId,
            endedAt: null,
            projectTeam: { projectId: application.topicId },
          },
          select: { id: true },
        });
        if (existingMembership) {
          return "STUDENT_ALREADY_IN_PROJECT";
        }

        const memberCount = existingTeam
          ? await transaction.projectTeamMembership.count({
              where: { projectTeamId: existingTeam.id, endedAt: null },
            })
          : 0;
        if (memberCount >= application.topic.capacity) {
          return "CAPACITY_REACHED";
        }

        const team = await transaction.projectTeam.upsert({
          where: { projectId: application.topicId },
          update: {},
          create: {
            projectId: application.topicId,
            name: application.topic.title,
          },
          select: { id: true },
        });
        await assignProgramDeliverablesToTeam(transaction, team.id, decidedAt);
        await transaction.projectTeamMembership.create({
          data: {
            projectTeamId: team.id,
            userId: application.studentId,
            sourceApplicationId: application.id,
            role: roleForAcceptedTeamMember(memberCount),
            joinedAt: decidedAt,
          },
        });
        const accepted = await transaction.topicApplication.updateMany({
          where: { id: application.id, status: "PENDING" },
          data: { status: "ACCEPTED", decidedAt, decidedById: actor.id, reviewComment },
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
            data: {
              status: "REJECTED",
              decidedAt,
              decidedById: actor.id,
              reviewComment: "다른 지원이 선정되었거나 프로젝트 정원이 충족되어 자동 미선정되었습니다.",
            },
          });
          await transaction.recruitmentApplication.updateMany({
            where: { topicApplicationId: { in: rejectedIds }, status: "PENDING" },
            data: { status: "REJECTED", decidedAt },
          });
        }

        if (reachesCapacity) {
          await transaction.recruitmentPost.updateMany({ where: { projectTeamId: team.id, status: "OPEN" }, data: { status: "CLOSED" } });
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
      select: { topicId: true, leaderId: true },
    });
    if (!group) return "CONFLICT";
    const applications = await transaction.topicApplication.findMany({
      where: { groupId },
      orderBy: { participantRole: "asc" },
      select: { id: true, studentId: true, status: true },
    });
    const programRows = await transaction.$queryRaw<Array<{
      endsAt: Date;
      studentProjectCreationEnabled: boolean;
      projectTeamMaxSize: number;
    }>>(Prisma.sql`
      SELECT "project_program"."endsAt", "project_program"."studentProjectCreationEnabled", "project_program"."projectTeamMaxSize"
      FROM "project_program"
      JOIN "topic" ON "topic"."programId" = "project_program"."id"
      WHERE "topic"."id" = ${group.topicId}
      FOR UPDATE OF "project_program"
    `);
    const topicRows = await transaction.$queryRaw<Array<{
      id: string;
      title: string;
      authorId: string;
      managerId: string | null;
      programId: string;
      capacity: number;
      status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE";
    }>>(Prisma.sql`
      SELECT "topic"."id", "topic"."title", "topic"."authorId", "topic"."managerId", "topic"."programId", "topic"."capacity",
             "topic"."status"
      FROM "topic"
      WHERE "topic"."id" = ${group.topicId}
      FOR UPDATE
    `);
    const topic = topicRows[0];
    if (
      !topic ||
      topic.status !== "ACTIVE" ||
      !programRows[0] || programRows[0].endsAt <= decidedAt ||
      programRows[0].studentProjectCreationEnabled ||
      applications.length === 0 ||
      applications.length > programRows[0].projectTeamMaxSize ||
      applications.some(({ status }) => status !== "PENDING")
    ) {
      return "CONFLICT";
    }
    if (!topic.managerId) return "CONFLICT";
    const assistantAllowed = await transaction.projectAssistant.findUnique({
      where: {
        topicId_userId: { topicId: topic.id, userId: actor.id },
      },
      select: { id: true },
    });
    if (!actor.isAdmin && topic.managerId !== actor.id && !assistantAllowed) return "FORBIDDEN";

    const studentIds = applications.map(({ studentId }) => studentId);
    const existingTeams = await transaction.$queryRaw<Array<{ id: string; confirmedAt: Date | null }>>(Prisma.sql`
      SELECT "id", "confirmedAt" FROM "project_team" WHERE "projectId" = ${group.topicId} FOR UPDATE
    `);
    if (existingTeams[0]?.confirmedAt) return "CONFLICT";
    const participants = await transaction.$queryRaw<Array<{ id: string; role: "STUDENT" | "PROFESSOR" | "ADMIN"; accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN" }>>(Prisma.sql`
      SELECT "id", "role", "accountStatus" FROM "user" WHERE "id" IN (${Prisma.join(studentIds)}) ORDER BY "id" FOR UPDATE
    `);
    if (!areActiveStudents(participants, studentIds.length)) return "CONFLICT";

    const existingMemberships = await transaction.projectTeamMembership.count({
      where: { userId: { in: studentIds }, endedAt: null, projectTeam: { projectId: topic.id } },
    });
    if (existingMemberships > 0) return "STUDENT_ALREADY_IN_PROJECT";

    const memberCount = existingTeams[0]
      ? await transaction.projectTeamMembership.count({ where: { projectTeamId: existingTeams[0].id, endedAt: null } })
      : 0;
    if (memberCount + applications.length > topic.capacity) return "CAPACITY_REACHED";
    if (memberCount === 0 && !applications.some(({ studentId }) => studentId === group.leaderId)) return "CONFLICT";

    const team = await transaction.projectTeam.upsert({
      where: { projectId: group.topicId },
      update: {},
      create: {
        projectId: group.topicId,
        name: topic.title,
      },
      select: { id: true },
    });
    await assignProgramDeliverablesToTeam(transaction, team.id, decidedAt);
    await transaction.projectTeamMembership.createMany({
      data: applications.map((application) => ({
        projectTeamId: team.id,
        userId: application.studentId,
        sourceApplicationId: application.id,
        role: roleForAcceptedTeamMember(memberCount, application.studentId === group.leaderId),
        joinedAt: decidedAt,
      })),
    });
    const accepted = await transaction.topicApplication.updateMany({
      where: { groupId, status: "PENDING" },
      data: { status: "ACCEPTED", decidedAt, decidedById: actor.id, reviewComment },
    });
    if (accepted.count !== applications.length) throw new DecisionWriteConflictError();

    const reachesCapacity = memberCount + applications.length === topic.capacity;
    const directlyConflicting = await transaction.topicApplication.findMany({
      where: {
        id: { notIn: applications.map(({ id }) => id) },
        status: "PENDING",
        OR: [
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
        data: {
          status: "REJECTED",
          decidedAt,
          decidedById: actor.id,
          reviewComment: "다른 지원이 선정되었거나 프로젝트 정원이 충족되어 자동 미선정되었습니다.",
        },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { topicApplicationId: { in: automaticallyRejected.map(({ id }) => id) }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
    }
    if (reachesCapacity) {
      await transaction.recruitmentPost.updateMany({ where: { projectTeamId: team.id, status: "OPEN" }, data: { status: "CLOSED" } });
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

function isActiveProjectMembershipUniqueConflict(
  error: Prisma.PrismaClientKnownRequestError,
): boolean {
  const target = error.meta?.target;
  return (
    Array.isArray(target) &&
    target.includes("projectTeamId") &&
    target.includes("userId")
  );
}

const DECISION_TRANSACTION_ATTEMPTS = 3;

function isRetryableDecisionConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}
