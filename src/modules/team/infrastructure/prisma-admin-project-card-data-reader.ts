import type { PrismaClient } from "@/generated/prisma/client";
import type {
  AdminProjectCardData,
  AdminProjectCardDataReader,
} from "@/modules/team/application/list-admin-project-card-data";
import { isReportSubmissionOverdue } from "@/modules/team/domain/project-progress";

export class PrismaAdminProjectCardDataReader implements AdminProjectCardDataReader {
  constructor(
    private readonly client: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listByTopicIds(topicIds: string[]): Promise<AdminProjectCardData[]> {
    if (!topicIds.length) return [];

    const teams = await this.client.projectTeam.findMany({
      where: { projectId: { in: topicIds } },
      select: {
        id: true,
        name: true,
        projectId: true,
        memberships: {
          where: { endedAt: null },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                contactEmail: true,
                phoneNumber: true,
                studentProfile: {
                  select: {
                    phone: true,
                    kakao: true,
                    github: true,
                    instagram: true,
                  },
                },
              },
            },
          },
        },
        reports: {
          where: { required: true },
          select: {
            dueAt: true,
            versions: { take: 1, select: { id: true } },
          },
        },
      },
    });
    const now = this.now();

    return teams.map((team) => ({
      topicId: team.projectId,
      team: {
        id: team.id,
        name: team.name,
        members: team.memberships.map(({ role, user }) => ({
          id: user.id,
          name: user.name,
          role,
          email: user.email,
          contactEmail: user.contactEmail,
          phone: user.studentProfile?.phone || user.phoneNumber,
          kakao: user.studentProfile?.kakao ?? null,
          github: user.studentProfile?.github ?? null,
          instagram: user.studentProfile?.instagram ?? null,
        })),
      },
      reportProgress: {
        requiredCount: team.reports.length,
        submittedCount: team.reports.filter(({ versions }) => versions.length > 0).length,
        overdueCount: team.reports.filter(({ dueAt, versions }) =>
          isReportSubmissionOverdue(dueAt, versions.length > 0, now),
        ).length,
      },
    }));
  }
}
