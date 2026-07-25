import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ReportWorkspace,
  ReportWorkspaceReader,
} from "@/modules/report/application/report-ports";

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
  if (actor.role === "PROFESSOR") return { professorId: actor.id };
  return { members: { some: { studentId: actor.id } } };
}
