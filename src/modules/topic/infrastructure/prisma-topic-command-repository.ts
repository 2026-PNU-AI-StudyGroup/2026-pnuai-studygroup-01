import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";
import type {
  TopicCreator,
  TopicDraft,
  TopicEditor,
  TopicStateRecord,
  TopicStateRepository,
} from "@/modules/topic/application/topic-ports";
import { topicSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export class PrismaTopicCommandRepository
  implements TopicCreator, TopicStateRepository, TopicEditor
{
  constructor(private readonly client: PrismaClient) {}

  createPublished(topic: TopicDraft, registeredAt: Date): Promise<{ id: string } | null> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program"
        WHERE "id" = ${topic.programId}
          AND "endsAt" > ${registeredAt}
          AND "projectRegistrationStartsAt" <= ${registeredAt}
          AND "projectRegistrationEndsAt" > ${registeredAt}
        FOR SHARE
      `);
      if (!programs[0]) return null;
      const divisions = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "program_track" WHERE "programId" = ${topic.programId} FOR SHARE
      `);
      if ((divisions.length > 0 && !topic.divisionId) || (topic.divisionId != null && !divisions.some(({ id }) => id === topic.divisionId))) return null;
      const { applicationQuestions, ...topicData } = topic;
      const created = await transaction.topic.create({
        data: {
          ...topicData,
          recruitmentEnabled: topic.recruitmentEnabled ?? true,
          managerId: topic.authorId,
          applicationQuestions: {
            create: applicationQuestions.map((question, position) => ({
              ...question,
              position,
            })),
          },
          status: "ACTIVE",
          publishedAt: registeredAt,
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
    topic: Omit<TopicDraft, "authorId" | "divisionId">,
  ) {
    return this.client.$transaction(async (transaction) => {
      // 지원 제출과 지원 수락은 둘 다 topic 행을 FOR UPDATE 로 잠근 뒤 진행한다. 같은
      // 잠금을 먼저 잡아야 아래 지원 수 검사가 방금 커밋된 지원서를 본다.
      //
      // 예전에는 잠금 없이 Serializable 로만 두었다. 상대가 READ COMMITTED 라 SSI 가
      // 걸리지 않고, Serializable 은 첫 읽기에서 스냅샷을 고정하므로 새로 삽입된 지원
      // 행이 끝까지 보이지 않았다. 그래서 지원 수를 0 으로 판단해
      // applicationQuestions.deleteMany 가 방금 제출된 답변까지 Cascade 로 지웠다.
      // 정원을 수락 진행 중에 그 아래로 내리는 것도 같은 이유로 통과했다.
      const locked = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "topic" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!locked[0]) return "NOT_FOUND" as const;
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
          projectTeam: { select: { _count: { select: { memberships: { where: { endedAt: null } } } } } },
        },
      });
      if (!current) return "NOT_FOUND" as const;
      if (current.programId !== topic.programId) return "PROGRAM_UNAVAILABLE" as const;
      const program = await transaction.projectProgram.findFirst({
        where: { id: current.programId, endsAt: { gt: new Date() } },
        select: { id: true },
      });
      if (!program) {
        return "PROGRAM_UNAVAILABLE" as const;
      }
      const formChanged = current.applicationMode !== topic.applicationMode ||
        JSON.stringify(current.applicationQuestions) !== JSON.stringify(topic.applicationQuestions);
      if (current._count.applications > 0 && formChanged) return "APPLICATION_FORM_LOCKED" as const;
      if ((current.projectTeam?._count.memberships ?? 0) > topic.capacity) return "CAPACITY_TOO_SMALL" as const;

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
    });
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
        recruitmentEnabled: true,
      },
    }).then((topic) => topic ? {
      ...topic,
      assistantIds: topic.assistants.map(({ userId }) => userId),
    } : null);
  }

  async closeRecruitment(id: string, actor: CurrentActor, closedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const result = await transaction.topic.updateMany({
        where: {
          id,
          status: "ACTIVE",
          recruitmentEnabled: true,
          ...topicSupervisorWhere(actor),
        },
        data: { recruitmentEnabled: false },
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
          decidedAt: closedAt,
          decidedById: actor.id,
          reviewComment: "담당 교수가 프로젝트 모집을 마감하여 자동 미선정되었습니다.",
        },
      });
      const closedRecruitmentPosts = await transaction.recruitmentPost.updateMany({
        where: { projectTeam: { projectId: id }, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { post: { projectTeam: { projectId: id } }, status: "PENDING" },
        data: { status: "REJECTED", decidedAt: closedAt },
      });
      await createApplicationResultNotifications(
        transaction,
        applications.map((application) => ({
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "REJECTED",
          createdAt: closedAt,
        })),
      );
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TOPIC_RECRUITMENT_CLOSED",
          targetType: "TOPIC",
          targetId: id,
          metadata: {
            rejectedApplicationCount: rejectedApplications.count,
            closedRecruitmentPostCount: closedRecruitmentPosts.count,
          },
          createdAt: closedAt,
        },
      });
      return true;
    });
  }

}
