import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import type { TopicApprovalRepository, TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import type { TopicDraft } from "@/modules/topic/application/topic-ports";

export class PrismaTopicApprovalRepository implements TopicApprovalRepository {
  constructor(private readonly client: PrismaClient) {}

  listProfessors() {
    return this.client.user.findMany({ where: { role: "PROFESSOR", isActive: true }, orderBy: [{ name: "asc" }, { email: "asc" }], select: { id: true, name: true, email: true } });
  }

  create(input: TopicDraft & { route: "PROFESSOR" | "ADMIN"; requestedProfessorId: string | null; requestedAt: Date }): Promise<string | null> {
    return this.client.$transaction(async (transaction) => {
      const program = await transaction.projectProgram.findFirst({ where: { id: input.programId, academicCycleId: input.academicCycleId, status: "OPEN" }, select: { id: true } });
      if (!program) return null;
      if (input.route === "PROFESSOR") {
        const professor = await transaction.user.findFirst({ where: { id: input.requestedProfessorId!, role: "PROFESSOR", isActive: true }, select: { id: true } });
        if (!professor) return null;
      }
      const { applicationQuestions, route, requestedProfessorId, requestedAt, ...topic } = input;
      const id = randomUUID();
      await transaction.topic.create({
        data: {
          id, ...topic, status: "DRAFT", publishedAt: null, createdAt: requestedAt, updatedAt: requestedAt,
          applicationQuestions: { create: applicationQuestions.map((question, position) => ({ id: randomUUID(), ...question, position })) },
          approvalRequest: { create: { id: randomUUID(), requesterId: input.authorId, route, requestedProfessorId, status: "PENDING", createdAt: requestedAt, updatedAt: requestedAt } },
        },
      });
      return id;
    });
  }

  async listVisible(actor: CurrentUser): Promise<TopicApprovalRequestSummary[]> {
    const where: Prisma.TopicApprovalRequestWhereInput = actor.role === "STUDENT"
      ? { requesterId: actor.id }
      : actor.role === "PROFESSOR"
        ? { route: "PROFESSOR", requestedProfessorId: actor.id }
        : { route: "ADMIN" };
    const requests = await this.client.topicApprovalRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        topic: { select: { title: true } },
        requester: { select: { name: true } },
        requestedProfessor: { select: { name: true } },
      },
    });
    return requests.map(({ topic, requester, requestedProfessor, ...request }) => ({
      ...request,
      topicTitle: topic.title,
      requesterName: requester.name,
      requestedProfessorName: requestedProfessor?.name ?? null,
    }));
  }

  decide(input: { requestId: string; actorId: string; actorRole: "PROFESSOR" | "ADMIN"; decision: "APPROVE" | "REJECT"; reviewComment: string; decidedAt: Date }): Promise<"APPROVED" | "REJECTED" | "FORBIDDEN" | "UNAVAILABLE"> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; topicId: string; route: "PROFESSOR" | "ADMIN"; requestedProfessorId: string | null; status: string }>>(Prisma.sql`
        SELECT "id", "topicId", "route", "requestedProfessorId", "status"
        FROM "topic_approval_request" WHERE "id" = ${input.requestId} FOR UPDATE
      `);
      const request = rows[0];
      if (!request || request.status !== "PENDING") return "UNAVAILABLE";
      const permitted = request.route === "PROFESSOR"
        ? input.actorRole === "PROFESSOR" && request.requestedProfessorId === input.actorId
        : input.actorRole === "ADMIN";
      if (!permitted) return "FORBIDDEN";
      if (input.decision === "APPROVE") {
        const topic = await transaction.topic.findFirst({ where: { id: request.topicId, status: "DRAFT", recruitmentEndsAt: { gt: input.decidedAt }, program: { status: "OPEN" } }, select: { id: true } });
        if (!topic) return "UNAVAILABLE";
        await transaction.topic.update({ where: { id: topic.id }, data: { status: "PUBLISHED", publishedAt: input.decidedAt } });
      }
      const status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      await transaction.topicApprovalRequest.update({ where: { id: request.id }, data: { status, reviewComment: input.reviewComment, decidedById: input.actorId, decidedAt: input.decidedAt } });
      return status;
    });
  }
}
