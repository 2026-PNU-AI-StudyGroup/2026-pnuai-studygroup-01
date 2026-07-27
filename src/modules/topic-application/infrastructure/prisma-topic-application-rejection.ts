import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotification } from "@/modules/notification/infrastructure/notification-events";
import type {
  RejectTopicApplicationOutcome,
  TopicApplicationDecisionActor,
} from "@/modules/topic-application/application/topic-application-ports";

const DECISION_TRANSACTION_ATTEMPTS = 3;

export class PrismaTopicApplicationRejection {
  constructor(private readonly client: PrismaClient) {}

  async reject(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment = "",
  ): Promise<RejectTopicApplicationOutcome> {
    for (let attempt = 1; attempt <= DECISION_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.rejectOnce(id, actor, decidedAt, reviewComment);
      } catch (error) {
        if (isRetryableDecisionConflict(error)) {
          if (attempt < DECISION_TRANSACTION_ATTEMPTS) continue;
          return "CONFLICT";
        }
        throw error;
      }
    }
    return "CONFLICT";
  }

  private rejectOnce(
    id: string,
    actor: TopicApplicationDecisionActor,
    decidedAt: Date,
    reviewComment: string,
  ): Promise<RejectTopicApplicationOutcome> {
    return this.client.$transaction(async (transaction) => {
      const initial = await transaction.topicApplication.findUnique({
        where: { id },
        select: { id: true, topicId: true, studentId: true, groupId: true },
      });
      if (!initial) return "CONFLICT";

      const initialTargets = initial.groupId
        ? await transaction.topicApplication.findMany({
            where: { groupId: initial.groupId },
            select: { id: true, studentId: true },
          })
        : [{ id: initial.id, studentId: initial.studentId }];
      if (!initialTargets.length) return "CONFLICT";

      await transaction.$queryRaw(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topicRows = await transaction.$queryRaw<Array<{
        managerId: string | null;
        title: string;
      }>>(Prisma.sql`
        SELECT "managerId", "title" FROM "topic" WHERE "id" = ${initial.topicId} FOR UPDATE
      `);
      const topic = topicRows[0];
      if (!topic) return "CONFLICT";
      const assistantAllowed = await transaction.projectAssistant.findUnique({
        where: {
          topicId_userId: { topicId: initial.topicId, userId: actor.id },
        },
        select: { id: true },
      });

      const teamRows = await transaction.$queryRaw<Array<{
        id: string;
        status: "FORMING" | "CONFIRMED" | "CLOSED";
      }>>(Prisma.sql`
        SELECT "id", "status" FROM "team" WHERE "topicId" = ${initial.topicId} FOR UPDATE
      `);
      const team = teamRows[0];

      const recruitment = initial.groupId === null
        ? await transaction.recruitmentApplication.findUnique({
            where: { topicApplicationId: initial.id },
            select: { postId: true },
          })
        : null;
      const postRows = recruitment
        ? await transaction.$queryRaw<Array<{
            authorId: string;
            status: "OPEN" | "CLOSED";
            teamId: string;
          }>>(Prisma.sql`
            SELECT "authorId", "status", "teamId" FROM "recruitment_post" WHERE "id" = ${recruitment.postId} FOR UPDATE
          `)
        : [];

      const studentIds = initialTargets.map(({ studentId }) => studentId).sort();
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "user" WHERE "id" IN (${Prisma.join(studentIds)}) ORDER BY "id" FOR UPDATE
      `);

      const targets = await transaction.topicApplication.findMany({
        where: { id: { in: initialTargets.map(({ id: targetId }) => targetId) } },
        select: { id: true, studentId: true, status: true },
      });
      if (
        targets.length !== initialTargets.length ||
        targets.some(({ status }) => status !== "PENDING")
      ) {
        return "CONFLICT";
      }

      const post = postRows[0];
      const recruiterAllowed =
        post?.authorId === actor.id &&
        post.status === "OPEN" &&
        post.teamId === team?.id &&
        team.status === "FORMING";
      if (!actor.isAdmin && topic.managerId !== actor.id && !assistantAllowed && !recruiterAllowed) {
        return "FORBIDDEN";
      }

      const result = await transaction.topicApplication.updateMany({
        where: {
          id: { in: targets.map(({ id: targetId }) => targetId) },
          status: "PENDING",
        },
        data: { status: "REJECTED", decidedAt, reviewComment },
      });
      if (result.count !== targets.length) return "CONFLICT";

      await transaction.recruitmentApplication.updateMany({
        where: {
          topicApplicationId: { in: targets.map(({ id: targetId }) => targetId) },
          status: "PENDING",
        },
        data: { status: "REJECTED", decidedAt },
      });
      for (const target of targets) {
        await createApplicationResultNotification(transaction, {
          applicationId: target.id,
          recipientId: target.studentId,
          topicTitle: topic.title,
          outcome: "REJECTED",
          createdAt: decidedAt,
        });
      }
      return "REJECTED";
    });
  }
}

function isRetryableDecisionConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}
