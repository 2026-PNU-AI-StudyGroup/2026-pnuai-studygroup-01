import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { ProjectProgramRecord, ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import type { ProjectProgramDetails } from "@/modules/project-program/domain/project-program-policy";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaProjectProgramRepository implements ProjectProgramRepository {
  constructor(private readonly client: PrismaClient) {}

  async create(input: ProjectProgramDetails & { academicCycleId: string; createdById: string }): Promise<"CREATED" | "CYCLE_NOT_FOUND" | "DUPLICATE"> {
    try {
      return await this.client.$transaction(async (transaction) => {
        if (!(await transaction.academicCycle.findUnique({ where: { id: input.academicCycleId }, select: { id: true } }))) return "CYCLE_NOT_FOUND";
        await transaction.projectProgram.create({ data: { ...input, status: "DRAFT", openedAt: null } });
        await enqueueTranslations(transaction, [input.name, input.category, input.description]);
        return "CREATED";
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "DUPLICATE";
      throw error;
    }
  }

  listAll(): Promise<ProjectProgramRecord[]> { return this.list({}); }
  listOpen(): Promise<ProjectProgramRecord[]> { return this.list({ status: "OPEN" }); }

  private async list(where: Prisma.ProjectProgramWhereInput): Promise<ProjectProgramRecord[]> {
    const programs = await this.client.projectProgram.findMany({
      where, orderBy: [{ academicCycle: { academicYear: "desc" } }, { startsAt: "desc" }, { name: "asc" }],
      include: {
        academicCycle: { select: { academicYear: true, term: true } },
        topics: { select: { status: true, team: { select: { id: true } } } },
      },
    });
    return programs.map(({ academicCycle, topics, ...program }) => ({
      ...program,
      academicYear: academicCycle.academicYear,
      term: academicCycle.term,
      topicCount: topics.filter(({ status }) => status === "PUBLISHED").length,
      teamCount: topics.filter(({ team }) => team !== null).length,
    }));
  }

  changeStatus(id: string, status: "OPEN" | "CLOSED", changedAt: Date): Promise<boolean> {
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
        await transaction.topic.updateMany({ where: { id: { in: topicIds }, status: "PUBLISHED" }, data: { status: "CLOSED" } });
        await transaction.topicApplication.updateMany({ where: { topicId: { in: topicIds }, status: "PENDING" }, data: { status: "REJECTED", decidedAt: changedAt } });
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

  findOpen(id: string): Promise<{ id: string; academicCycleId: string; startsAt: Date; endsAt: Date } | null> {
    return this.client.projectProgram.findFirst({ where: { id, status: "OPEN" }, select: { id: true, academicCycleId: true, startsAt: true, endsAt: true } });
  }
}
