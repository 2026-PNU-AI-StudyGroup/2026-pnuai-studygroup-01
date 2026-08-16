import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AdminProgramProjectOperationRecord,
  AdminProgramProjectOperationsReader,
} from "@/modules/team/application/list-admin-program-project-operations";

export class PrismaAdminProgramProjectOperationsReader implements AdminProgramProjectOperationsReader {
  constructor(private readonly client: PrismaClient) {}

  async listByProgram(programId: string, divisionId?: string | "UNASSIGNED"): Promise<AdminProgramProjectOperationRecord[]> {
    const topics = await this.client.topic.findMany({
      where: {
        programId,
        status: "ACTIVE",
        ...(divisionId === "UNASSIGNED" ? { divisionId: null } : divisionId ? { divisionId } : {}),
      },
      select: {
        id: true,
        projectTeam: {
          select: {
            reports: {
              where: { required: true, submissionEnabled: true },
              select: {
                dueAt: true,
                versions: { take: 1, select: { id: true } },
              },
            },
          },
        },
      },
    });

    return topics.map(({ id, projectTeam }) => ({
      topicId: id,
      team: projectTeam ? {
        reports: projectTeam.reports.map(({ dueAt, versions }) => ({
          dueAt,
          submitted: versions.length > 0,
        })),
      } : null,
    }));
  }
}
