import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  AdminProjectOverviewProgram,
  AdminProjectOverviewReader,
} from "@/modules/team/application/list-admin-project-overview";
import { isReportSubmissionOverdue } from "@/modules/team/domain/project-progress";
import { getProgramStartYear } from "@/modules/project-program/domain/project-program-policy";

const overviewInclude = {
  topics: {
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      team: {
        select: {
          id: true,
          name: true,
          status: true,
          members: { select: { id: true } },
          topic: {
            select: {
              manager: { select: { name: true } },
            },
          },
          reports: {
            select: {
              dueAt: true,
              versions: {
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectProgramInclude;

export class PrismaAdminProjectOverviewReader
  implements AdminProjectOverviewReader
{
  constructor(
    private readonly client: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listByProgram(): Promise<AdminProjectOverviewProgram[]> {
    const now = this.now();
    const programs = await this.client.projectProgram.findMany({
      orderBy: [
        { startsAt: "desc" },
        { name: "asc" },
      ],
      include: overviewInclude,
    });

    return programs.map(({ topics, ...program }) => ({
      id: program.id,
      name: program.name,
      category: program.category,
      icon: program.icon,
      startYear: getProgramStartYear(program.startsAt),
      status: program.status,
      advisorEnabled: program.advisorEnabled,
      projects: topics.flatMap(({ title, team }) => team ? [{
        id: team.id,
        name: team.name,
        topicTitle: title,
        professorName: team.topic.manager?.name ?? "담당 교수 미정",
        advisorEnabled: program.advisorEnabled,
        status: team.status,
        memberCount: team.members.length,
        reportCount: team.reports.length,
        submittedReportCount: team.reports.filter(
          (report) => report.versions.length > 0,
        ).length,
        overdueReportCount: team.reports.filter(
          (report) => isReportSubmissionOverdue(
            report.dueAt,
            report.versions.length > 0,
            now,
          ),
        ).length,
      }] : []),
    }));
  }
}
