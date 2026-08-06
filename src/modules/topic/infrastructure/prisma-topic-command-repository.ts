import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";
import type {
  TopicCreator,
  TopicDraft,
  TopicEditor,
  TopicScheduleUpdater,
  TopicStateRecord,
  TopicStateRepository,
} from "@/modules/topic/application/topic-ports";
import type { TopicSchedule } from "@/modules/topic/domain/topic-policy";
import { topicSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";
import { topicSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export class PrismaTopicCommandRepository
  implements TopicCreator, TopicStateRepository, TopicScheduleUpdater, TopicEditor
{
  constructor(private readonly client: PrismaClient) {}

  createDraft(topic: TopicDraft, registeredAt: Date): Promise<{ id: string } | null> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program"
        WHERE "id" = ${topic.programId}
          AND "status" = 'OPEN'::"ProjectProgramStatus"
          AND "projectRegistrationStartsAt" <= ${registeredAt}
          AND "projectRegistrationEndsAt" > ${registeredAt}
        FOR SHARE
      `);
      if (!programs[0]) return null;
      const { applicationQuestions, ...topicData } = topic;
      const created = await transaction.topic.create({
        data: {
          ...topicData,
          managerId: topic.authorId,
          applicationQuestions: {
            create: applicationQuestions.map((question, position) => ({
              ...question,
              position,
            })),
          },
          status: "DRAFT",
          publishedAt: null,
        },
        select: { id: true },
      });
      await enqueueTranslations(transaction, [
        topic.title,
        topic.description,
        ...topic.requiredSkills,
        ...topic.preferredSkills,
        topic.roleExpectations,
        topic.availabilityRequirement,
        ...topic.applicationQuestions.map(({ label }) => label),
      ]);
      return created;
    });
  }

  update(
    id: string,
    actor: CurrentActor,
    topic: Omit<TopicDraft, "authorId">,
  ) {
    return this.client.$transaction(async (transaction) => {
      const current = await transaction.topic.findFirst({
        where: { id, ...topicSupervisorWhere(actor) },
        select: {
          id: true,
          programId: true,
          status: true,
          applicationMode: true,
          applicationQuestions: {
            orderBy: { position: "asc" },
            select: { label: true, maxLength: true, required: true },
          },
          _count: { select: { applications: true } },
          team: { select: { _count: { select: { members: true } } } },
        },
      });
      if (!current) return "NOT_FOUND" as const;
      if (current.status === "CLOSED") return "CLOSED" as const;
      if (current.programId !== topic.programId) return "PROGRAM_UNAVAILABLE" as const;
      const program = await transaction.projectProgram.findFirst({
        where: { id: current.programId, status: "OPEN" },
        select: { startsAt: true, endsAt: true },
      });
      const times = [topic.recruitmentStartsAt, topic.recruitmentEndsAt, topic.executionStartsAt, topic.executionEndsAt, topic.submissionStartsAt, topic.submissionEndsAt];
      if (!program || times.some((time) => time < program.startsAt || time > program.endsAt)) {
        return "PROGRAM_UNAVAILABLE" as const;
      }
      const formChanged = current.applicationMode !== topic.applicationMode ||
        JSON.stringify(current.applicationQuestions) !== JSON.stringify(topic.applicationQuestions);
      if (current._count.applications > 0 && formChanged) return "APPLICATION_FORM_LOCKED" as const;
      if ((current.team?._count.members ?? 0) > topic.capacity) return "CAPACITY_TOO_SMALL" as const;

      const { applicationQuestions, ...data } = topic;
      await transaction.topic.update({
        where: { id: current.id },
        data: {
          ...data,
          ...(current._count.applications === 0 ? {
            applicationQuestions: {
              deleteMany: {},
              create: applicationQuestions.map((question, position) => ({ ...question, position })),
            },
          } : {}),
        },
      });
      await enqueueTranslations(transaction, [
        topic.title,
        topic.description,
        ...topic.requiredSkills,
        ...topic.preferredSkills,
        topic.roleExpectations,
        topic.availabilityRequirement,
        ...topic.applicationQuestions.map(({ label }) => label),
      ]);
      return "UPDATED" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async deleteDraft(id: string, actor: CurrentActor): Promise<boolean> {
    const result = await this.client.topic.deleteMany({
      where: {
        id,
        status: "DRAFT",
        applications: { none: {} },
        approvalRequest: null,
        team: null,
        ...topicSupervisorWhere(actor),
      },
    });
    return result.count === 1;
  }

  findState(id: string): Promise<TopicStateRecord | null> {
    return this.client.topic.findUnique({
      where: { id },
      select: {
        id: true,
        programId: true,
        authorId: true,
        managerId: true,
        assistants: { select: { userId: true } },
        status: true,
        recruitmentEndsAt: true,
      },
    }).then((topic) => topic ? {
      ...topic,
      assistantIds: topic.assistants.map(({ userId }) => userId),
    } : null);
  }

  async publishDraft(id: string, actor: CurrentActor, publishedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program"
        JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${id}
          AND "project_program"."status" = 'OPEN'::"ProjectProgramStatus"
          AND "project_program"."projectRegistrationStartsAt" <= ${publishedAt}
          AND "project_program"."projectRegistrationEndsAt" > ${publishedAt}
        FOR SHARE OF "project_program"
      `);
      if (!programs[0]) return false;
      const result = await transaction.topic.updateMany({
        where: {
          id,
          status: "DRAFT",
          recruitmentEndsAt: { gt: publishedAt },
          requiredSkills: { isEmpty: false },
          roleExpectations: { not: "" },
          availabilityRequirement: { not: "" },
          applicationQuestions: { some: {} },
          managerId: { not: null },
          ...topicSupervisorWhere(actor),
        },
        data: { status: "PUBLISHED", publishedAt },
      });
      return result.count === 1;
    });
  }

  async closePublished(id: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const result = await transaction.topic.updateMany({
        where: { id, status: "PUBLISHED", ...topicSupervisorWhere(actor) },
        data: { status: "CLOSED" },
      });
      if (result.count !== 1) return false;
      const applications = await transaction.topicApplication.findMany({
        where: { topicId: id, status: "PENDING" },
        select: {
          id: true,
          studentId: true,
          topic: { select: { title: true } },
        },
      });
      const rejectedApplications = await transaction.topicApplication.updateMany({
        where: { topicId: id, status: "PENDING" },
        data: {
          status: "REJECTED",
          decidedAt,
          decidedById: actor.id,
          reviewComment: "프로젝트 모집이 마감되어 자동 미선정되었습니다.",
        },
      });
      const closedRecruitmentPosts = await transaction.recruitmentPost.updateMany({
        where: { team: { topicId: id }, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { post: { team: { topicId: id } }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
      await createApplicationResultNotifications(
        transaction,
        applications.map((application) => ({
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "REJECTED",
          createdAt: decidedAt,
        })),
      );
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TOPIC_CLOSED",
          targetType: "TOPIC",
          targetId: id,
          metadata: {
            rejectedApplicationCount: rejectedApplications.count,
            closedRecruitmentPostCount: closedRecruitmentPosts.count,
          },
          createdAt: decidedAt,
        },
      });
      return true;
    });
  }

  async updateSchedule(
    id: string,
    actor: CurrentActor,
    schedule: TopicSchedule,
  ): Promise<boolean> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE "topic"
      SET
        "recruitmentStartsAt" = ${schedule.recruitmentStartsAt},
        "recruitmentEndsAt" = ${schedule.recruitmentEndsAt},
        "executionStartsAt" = ${schedule.executionStartsAt},
        "executionEndsAt" = ${schedule.executionEndsAt},
        "submissionStartsAt" = ${schedule.submissionStartsAt},
        "submissionEndsAt" = ${schedule.submissionEndsAt},
        "updatedAt" = ${new Date()}
      FROM "project_program"
      WHERE "topic"."id" = ${id}
        AND "topic"."programId" = "project_program"."id"
        AND "topic"."status" <> 'CLOSED'::"TopicStatus"
        AND "project_program"."status" = 'OPEN'::"ProjectProgramStatus"
        AND ${topicSupervisorSql(actor)}
        AND ${schedule.recruitmentStartsAt} >= "project_program"."startsAt"
        AND ${schedule.recruitmentEndsAt} <= "project_program"."endsAt"
        AND ${schedule.executionStartsAt} >= "project_program"."startsAt"
        AND ${schedule.executionEndsAt} <= "project_program"."endsAt"
        AND ${schedule.submissionStartsAt} >= "project_program"."startsAt"
        AND ${schedule.submissionEndsAt} <= "project_program"."endsAt"
      RETURNING "topic"."id"
    `);
    return rows.length === 1;
  }
}
