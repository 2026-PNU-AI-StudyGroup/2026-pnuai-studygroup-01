import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { ProjectProgramRecord, ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import { getProgramStartYear, type ProjectProgramDetails } from "@/modules/project-program/domain/project-program-policy";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaProjectProgramRepository implements ProjectProgramRepository {
  constructor(private readonly client: PrismaClient) {}

  async create(input: ProjectProgramDetails & { createdById: string }): Promise<"CREATED" | "DUPLICATE"> {
    try {
      return await this.client.$transaction(async (transaction) => {
        await transaction.projectProgram.create({ data: { ...input, status: "DRAFT", openedAt: null } });
        await enqueueTranslations(transaction, [input.name, input.category, input.description]);
        return "CREATED" as const;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        isProgramIdentityConflict(error.meta?.target)
      ) return "DUPLICATE";
      throw error;
    }
  }

  listAll(): Promise<ProjectProgramRecord[]> { return this.list({}); }
  listOpen(): Promise<ProjectProgramRecord[]> { return this.list({ status: "OPEN" }); }

  private async list(where: Prisma.ProjectProgramWhereInput): Promise<ProjectProgramRecord[]> {
    const programs = await this.client.projectProgram.findMany({
      where, orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      include: {
        topics: { select: { status: true, team: { select: { id: true } } } },
      },
    });
    return programs.map(({ topics, ...program }) => ({
      ...program,
      startYear: getProgramStartYear(program.startsAt),
      topicCount: topics.filter(({ status }) => status === "PUBLISHED").length,
      teamCount: topics.filter(({ team }) => team !== null).length,
    }));
  }

  changeStatus(id: string, status: "OPEN" | "CLOSED", changedById: string, changedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!rows[0]) return false;
      const result = await transaction.projectProgram.updateMany({
        where: status === "OPEN"
          ? { id, status: "DRAFT", endsAt: { gt: changedAt } }
          : { id, status: "OPEN" },
        data: status === "OPEN" ? { status, openedAt: changedAt } : { status },
      });
      if (result.count !== 1) return false;
      if (status === "CLOSED") {
        const topicIds = (await transaction.topic.findMany({ where: { programId: id }, select: { id: true } })).map(({ id: topicId }) => topicId);
        const applications = await transaction.topicApplication.findMany({
          where: { topicId: { in: topicIds }, status: "PENDING" },
          select: { id: true, studentId: true, topic: { select: { title: true } } },
        });
        await transaction.topicApprovalRequest.updateMany({
          where: { topicId: { in: topicIds }, status: "PENDING" },
          data: {
            status: "REJECTED",
            reviewComment: "프로그램 종료로 승인 요청이 자동 종료되었습니다.",
            decidedAt: changedAt,
          },
        });
        await transaction.topic.updateMany({ where: { id: { in: topicIds }, status: "PUBLISHED" }, data: { status: "CLOSED" } });
        await transaction.topicApplication.updateMany({
          where: { topicId: { in: topicIds }, status: "PENDING" },
          data: {
            status: "REJECTED",
            decidedAt: changedAt,
            decidedById: changedById,
            reviewComment: "프로그램이 종료되어 자동 미선정되었습니다.",
          },
        });
        await transaction.recruitmentPost.updateMany({ where: { team: { topicId: { in: topicIds } }, status: "OPEN" }, data: { status: "CLOSED" } });
        await transaction.recruitmentApplication.updateMany({ where: { post: { team: { topicId: { in: topicIds } } }, status: "PENDING" }, data: { status: "REJECTED", decidedAt: changedAt } });
        await createApplicationResultNotifications(transaction, applications.map((application) => ({
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "REJECTED",
          createdAt: changedAt,
        })));
      }
      return true;
    });
  }

  async changeStudentProjectCreation(id: string, enabled: boolean): Promise<boolean> {
    const result = await this.client.projectProgram.updateMany({
      where: { id, status: { not: "CLOSED" } },
      data: { studentProjectCreationEnabled: enabled },
    });
    return result.count === 1;
  }

  findOpen(id: string): Promise<{ id: string; startsAt: Date; endsAt: Date; advisorEnabled: boolean; studentProjectCreationEnabled: boolean } | null> {
    return this.client.projectProgram.findFirst({
      where: { id, status: "OPEN" },
      select: { id: true, startsAt: true, endsAt: true, advisorEnabled: true, studentProjectCreationEnabled: true },
    });
  }
}

function isProgramIdentityConflict(target: unknown): boolean {
  return Array.isArray(target) && target.includes("name") && target.includes("startsAt");
}
