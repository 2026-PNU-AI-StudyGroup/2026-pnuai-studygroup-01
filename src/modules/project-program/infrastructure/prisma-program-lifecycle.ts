import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

type LifecycleActor =
  | { kind: "USER"; id: string }
  | { kind: "SYSTEM"; id?: never };

type LifecycleTransaction = Prisma.TransactionClient;

/**
 * Runs idempotent end-of-program side effects. Project completion itself is not
 * persisted: it is always derived from ProjectProgram.endsAt and confirmedAt.
 */
export async function finalizeProgram(
  client: PrismaClient,
  input: {
    programId: string;
    actor: LifecycleActor;
    processedAt: Date;
    endsAt?: Date;
  },
): Promise<boolean> {
  return client.$transaction((transaction) => finalizeProgramInTransaction(transaction, input));
}

export async function finalizeExpiredPrograms(client: PrismaClient, now: Date): Promise<number> {
  const expired = await client.projectProgram.findMany({
    where: { endsAt: { lte: now }, endProcessedAt: null },
    orderBy: [{ endsAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  let finalized = 0;
  for (const program of expired) {
    if (await finalizeProgram(client, {
      programId: program.id,
      actor: { kind: "SYSTEM" },
      processedAt: now,
    })) finalized += 1;
  }
  return finalized;
}

async function finalizeProgramInTransaction(
  transaction: LifecycleTransaction,
  input: {
    programId: string;
    actor: LifecycleActor;
    processedAt: Date;
    endsAt?: Date;
  },
): Promise<boolean> {
  const rows = await transaction.$queryRaw<Array<{
    id: string;
    endsAt: Date;
    endProcessedAt: Date | null;
  }>>(Prisma.sql`
    SELECT "id", "endsAt", "endProcessedAt"
    FROM "project_program"
    WHERE "id" = ${input.programId}
    FOR UPDATE
  `);
  const program = rows[0];
  if (!program) return false;

  const endsAt = input.endsAt ?? program.endsAt;
  if (endsAt > input.processedAt) return false;
  // Extending a program clears endProcessedAt in the settings repository. If it
  // is still present here, this end event has already been processed regardless
  // of whether the caller supplied an explicit endsAt.
  if (program.endProcessedAt !== null) return false;

  const actorId = input.actor.kind === "USER" ? input.actor.id : null;
  const projects = await transaction.topic.findMany({
    where: { programId: input.programId },
    select: { id: true, status: true, projectTeam: { select: { confirmedAt: true } } },
  });
  const topicIds = projects.map(({ id }) => id);
  const pendingRegistrationTopicIds = projects
    .filter(({ status, projectTeam }) => status === "PENDING_APPROVAL" && projectTeam?.confirmedAt === null)
    .map(({ id }) => id);
  const pendingApplications = await transaction.topicApplication.findMany({
    where: { topicId: { in: topicIds }, status: "PENDING" },
    select: { id: true, studentId: true, topic: { select: { title: true } } },
  });
  const pendingApprovalRequests = await transaction.topicApprovalRequest.findMany({
    where: { topicId: { in: topicIds }, status: "PENDING" },
    select: { id: true, topicId: true, requesterId: true, topic: { select: { title: true } } },
  });
  const pendingGuidanceRequests = await transaction.projectGuidanceRequest.findMany({
    where: { projectTeam: { project: { programId: input.programId } }, status: "PENDING" },
    select: {
      id: true,
      requesterId: true,
      projectTeam: { select: { projectId: true, name: true } },
    },
  });

  await transaction.topicApprovalRequest.updateMany({
    where: { topicId: { in: topicIds }, status: "PENDING" },
    data: {
      status: "CANCELED",
      reviewComment: "프로그램 종료로 승인 요청이 취소되었습니다.",
      decidedById: actorId,
      decidedAt: input.processedAt,
    },
  });
  // 승인 대기 등록은 실행 프로젝트가 아니다. 프로그램 종료로 요청이 취소되면
  // 등록 당시 만든 팀 스냅샷도 함께 제거해 대기 팀이 남지 않게 한다.
  if (pendingRegistrationTopicIds.length) {
    await transaction.topic.updateMany({
      where: { id: { in: pendingRegistrationTopicIds }, status: "PENDING_APPROVAL" },
      data: { status: "REJECTED" },
    });
    await transaction.projectTeam.deleteMany({
      where: { projectId: { in: pendingRegistrationTopicIds }, confirmedAt: null },
    });
  }
  await transaction.topicApplication.updateMany({
    where: { topicId: { in: topicIds }, status: "PENDING" },
    data: {
      status: "REJECTED",
      decidedAt: input.processedAt,
      decidedById: actorId,
      reviewComment: "프로그램이 종료되어 자동 미선정되었습니다.",
    },
  });
  await transaction.recruitmentPost.updateMany({
    where: { projectTeam: { project: { programId: input.programId } }, status: "OPEN" },
    data: { status: "CLOSED" },
  });
  await transaction.recruitmentApplication.updateMany({
    where: {
      post: { projectTeam: { project: { programId: input.programId } } },
      status: "PENDING",
    },
    data: { status: "REJECTED", decidedAt: input.processedAt },
  });
  await transaction.projectGuidanceRequest.updateMany({
    where: { projectTeam: { project: { programId: input.programId } }, status: "PENDING" },
    data: { status: "CANCELED", canceledAt: input.processedAt },
  });
  await transaction.projectProgram.update({
    where: { id: input.programId },
    data: { endsAt, endProcessedAt: input.processedAt },
  });
  await createApplicationResultNotifications(transaction, pendingApplications.map((application) => ({
    applicationId: application.id,
    recipientId: application.studentId,
    topicTitle: application.topic.title,
    outcome: "REJECTED" as const,
    createdAt: input.processedAt,
  })));
  if (pendingApprovalRequests.length || pendingGuidanceRequests.length) {
    await enqueueEmailEvents(transaction, [
      ...pendingApprovalRequests.map((request) => ({
        kind: "TOPIC_APPROVAL" as const,
        recipientId: request.requesterId,
        title: "프로젝트 등록이 취소되었습니다",
        body: `${request.topic.title} 등록이 프로그램 종료로 취소되었습니다.`,
        titleEn: "Project registration canceled",
        bodyEn: `The registration for ${request.topic.title} was canceled because the program has ended.`,
        href: "/dashboard",
        idempotencyKey: `email:program-close:topic-approval:${request.id}`,
        createdAt: input.processedAt,
      })),
      ...pendingGuidanceRequests.map((request) => ({
        kind: "PROJECT_REQUEST" as const,
        recipientId: request.requesterId,
        title: "프로젝트 요청이 취소되었습니다",
        body: `${request.projectTeam.name}의 대기 요청이 프로그램 종료로 취소되었습니다.`,
        titleEn: "Project request canceled",
        bodyEn: `The pending request from ${request.projectTeam.name} was canceled because the program has ended.`,
        href: `/projects/${request.projectTeam.projectId}/requests`,
        idempotencyKey: `email:program-close:guidance:${request.id}`,
        createdAt: input.processedAt,
      })),
    ]);
    await transaction.notification.createMany({
      data: [
        ...pendingApprovalRequests.map((request) => ({
          recipientId: request.requesterId,
          type: "TOPIC_APPROVAL" as const,
          title: "프로젝트 등록이 취소되었습니다",
          body: `${request.topic.title} 등록이 프로그램 종료로 취소되었습니다.`,
          href: "/dashboard",
          dedupeKey: `program-close:topic-approval:${request.id}`,
          createdAt: input.processedAt,
        })),
        ...pendingGuidanceRequests.map((request) => ({
          recipientId: request.requesterId,
          type: "PROJECT_REQUEST" as const,
          title: "프로젝트 요청이 취소되었습니다",
          body: `${request.projectTeam.name}의 대기 요청이 프로그램 종료로 취소되었습니다.`,
          href: `/projects/${request.projectTeam.projectId}/requests`,
          dedupeKey: `program-close:guidance:${request.id}`,
          createdAt: input.processedAt,
        })),
      ],
      skipDuplicates: true,
    });
  }

  const completedProjectCount = projects.filter(({ projectTeam }) => projectTeam?.confirmedAt).length;
  await transaction.auditLog.create({
    data: {
      actorKind: input.actor.kind,
      actorId,
      action: "PROGRAM_CLOSED",
      targetType: "PROJECT_PROGRAM",
      targetId: input.programId,
      metadata: {
        endsAt: endsAt.toISOString(),
        completedProjectCount,
        canceledProjectCount: projects.length - completedProjectCount,
      },
      createdAt: input.processedAt,
    },
  });
  return true;
}
