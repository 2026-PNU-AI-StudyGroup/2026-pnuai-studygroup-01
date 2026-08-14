import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  AdminProjectOverviewProgram,
  AdminProjectOverviewReader,
} from "@/modules/team/application/list-admin-project-overview";
import { isReportSubmissionOverdue } from "@/modules/team/domain/project-progress";
import {
  getProgramStartYear,
  isProgramVotingOpen,
} from "@/modules/project-program/domain/project-program-policy";

const overviewInclude = {
  votingPolicy: {
    select: {
      startsAt: true,
      endsAt: true,
      voteLimit: true,
      voteLimitScope: true,
      selfVotingAllowed: true,
    },
  },
  topics: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      projectTeam: {
        select: {
          id: true,
          name: true,
          confirmedAt: true,
          memberships: { where: { endedAt: null }, select: { id: true } },
          project: {
            select: {
              manager: { select: { name: true } },
            },
          },
          reports: {
            where: { required: true },
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
      status: program.endsAt <= now ? "CLOSED" : program.isPublic ? "OPEN" : "DRAFT",
      isPublic: program.isPublic,
      votingEndsAt: isProgramVotingOpen(program.votingPolicy, now)
        ? program.votingPolicy?.endsAt
        : undefined,
      advisorEnabled: program.advisorEnabled,
      projects: topics.flatMap(({ id, title, projectTeam }) => projectTeam ? [{
        id,
        name: projectTeam.name,
        topicTitle: title,
        professorName: projectTeam.project.manager?.name ?? "담당 교수 미정",
        advisorEnabled: program.advisorEnabled,
        status: program.endsAt <= now
          ? projectTeam.confirmedAt ? "COMPLETED" as const : "CANCELED" as const
          : projectTeam.confirmedAt ? "IN_PROGRESS" as const : "FORMING" as const,
        memberCount: projectTeam.memberships.length,
        reportCount: projectTeam.reports.length,
        submittedReportCount: projectTeam.reports.filter(
          (report) => report.versions.length > 0,
        ).length,
        overdueReportCount: projectTeam.reports.filter(
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
