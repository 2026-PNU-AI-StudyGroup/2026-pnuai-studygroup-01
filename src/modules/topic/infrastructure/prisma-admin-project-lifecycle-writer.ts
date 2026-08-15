import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  AdminProjectLifecycleOutcome,
  AdminProjectLifecycleWriter,
} from "@/modules/topic/application/manage-admin-project-lifecycle";

export class PrismaAdminProjectLifecycleWriter implements AdminProjectLifecycleWriter {
  constructor(private readonly client: PrismaClient) {}

  transition(input: Parameters<AdminProjectLifecycleWriter["transition"]>[0]): Promise<AdminProjectLifecycleOutcome> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{
        id: string;
        status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE";
        endsAt: Date;
      }>>(Prisma.sql`
        SELECT project."id", project."status", program."endsAt"
        FROM "topic" project
        JOIN "project_program" program ON program."id" = project."programId"
        WHERE project."id" = ${input.projectId}
        FOR UPDATE OF project, program
      `);
      const project = rows[0];
      if (!project) return "NOT_FOUND";
      if (project.status !== "REJECTED") return "INVALID_TRANSITION";
      if (project.endsAt <= input.changedAt) return "PROGRAM_ENDED";

      const previous = await transaction.topicApprovalRequest.findFirst({
        where: { topicId: project.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          requesterId: true,
          route: true,
          requestedProfessorId: true,
          studentTeamId: true,
          studentTeamVersion: true,
        },
      });
      if (!previous) return "NO_APPROVAL_HISTORY";
      await transaction.topicApprovalRequest.create({
        data: {
          id: randomUUID(),
          topicId: project.id,
          ...previous,
          status: "PENDING",
          reviewComment: "",
          createdAt: input.changedAt,
          updatedAt: input.changedAt,
        },
      });
      await transaction.topic.update({
        where: { id: project.id },
        data: { status: "PENDING_APPROVAL" },
      });
      await transaction.auditLog.create({
        data: {
          actorKind: "USER",
          actorId: input.actorId,
          action: "PROJECT_REVIEW_REQUESTED",
          targetType: "TOPIC",
          targetId: input.projectId,
          metadata: { reason: input.reason },
          createdAt: input.changedAt,
        },
      });
      return "UPDATED";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
