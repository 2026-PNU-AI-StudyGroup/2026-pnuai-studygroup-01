import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ReportWorkspace,
  ReportWorkspaceReader,
} from "@/modules/report/application/report-ports";
import { teamSupervisorWhere } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export class PrismaReportQueryRepository implements ReportWorkspaceReader {
  constructor(private readonly client: PrismaClient) {}

  async findWorkspace(
    teamId: string,
    actor: CurrentActor,
  ): Promise<ReportWorkspace | null> {
    const team = await this.client.team.findFirst({
      where: { id: teamId, ...teamActorWhere(actor) },
      select: {
        reports: {
          orderBy: [{ dueAt: "asc" }, { type: "asc" }],
          select: {
            id: true,
            type: true,
            dueAt: true,
            score: true,
            scoreComment: true,
            scoredAt: true,
            scoredBy: { select: { name: true } },
            feedback: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                body: true,
                createdAt: true,
                author: { select: { name: true, role: true } },
              },
            },
            versions: {
              orderBy: { version: "desc" },
              select: {
                id: true,
                version: true,
                fileId: true,
                description: true,
                submittedAt: true,
                file: { select: { originalName: true } },
                submitter: { select: { name: true } },
                decision: {
                  select: {
                    decision: true,
                    comment: true,
                    decidedAt: true,
                    reviewer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        artifacts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            title: true,
            fileId: true,
            externalUrl: true,
            createdAt: true,
          },
        },
      },
    });
    if (!team) return null;

    return {
      reports: team.reports.map((report) => ({
        id: report.id,
        type: report.type,
        dueAt: report.dueAt,
        score: report.score ?? undefined,
        scoreComment: report.scoreComment ?? undefined,
        scoredByName: report.scoredBy?.name ?? undefined,
        scoredAt: report.scoredAt ?? undefined,
        feedback: report.feedback.map((item) => ({
          id: item.id,
          authorName: item.author.name,
          authorRole: item.author.role,
          body: item.body,
          createdAt: item.createdAt,
        })),
        versions: report.versions.map(
          ({ file, submitter, decision, ...version }) => ({
            ...version,
            fileName: file.originalName,
            submitterName: submitter.name,
            decision: decision
              ? {
                  decision: decision.decision,
                  comment: decision.comment,
                  decidedAt: decision.decidedAt,
                  reviewerName: decision.reviewer.name,
                }
              : undefined,
          }),
        ),
      })),
      artifacts: team.artifacts.map((artifact) => ({
        ...artifact,
        fileId: artifact.fileId ?? undefined,
        externalUrl: artifact.externalUrl ?? undefined,
      })),
    };
  }
}

function teamActorWhere(actor: CurrentActor): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  return {
    OR: [
      teamSupervisorWhere(actor),
      { members: { some: { studentId: actor.id } } },
    ],
  };
}
