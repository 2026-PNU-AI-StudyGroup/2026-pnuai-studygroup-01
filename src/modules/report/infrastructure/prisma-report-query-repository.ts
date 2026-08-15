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
    const team = await this.client.projectTeam.findFirst({
      where: { id: teamId, ...teamActorWhere(actor) },
      select: {
        reports: {
          where: { OR: [{ required: true }, { versions: { some: {} } }] },
          orderBy: [{ definition: { position: "asc" } }, { dueAt: "asc" }],
          select: {
            id: true,
            titleSnapshot: true,
            required: true,
            dueAt: true,
            definition: { select: { position: true } },
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
        thumbnailPath: true,
        artifacts: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            type: true,
            title: true,
            fileId: true,
            externalUrl: true,
            position: true,
            createdAt: true,
          },
        },
      },
    });
    if (!team) return null;

    return {
      reports: team.reports.map((report) => ({
        id: report.id,
        title: report.titleSnapshot,
        position: report.definition.position,
        required: report.required,
        dueAt: report.dueAt,
        feedback: report.feedback.map((item) => ({
          id: item.id,
          authorName: item.author.name,
          // 피드백 작성자는 지도교수·조교·관리자로 제한되어 ADVISOR가 올 수 없다(report-feedback-repository의 teamSupervisorWhere 참고).
          authorRole: item.author.role as "STUDENT" | "PROFESSOR" | "ADMIN",
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
      thumbnailPath: team.thumbnailPath ?? undefined,
    };
  }
}

function teamActorWhere(actor: CurrentActor): Prisma.ProjectTeamWhereInput {
  if (actor.role === "ADMIN") return {};
  const now = new Date();
  return {
    AND: [
      { OR: [
        { project: { program: { endsAt: { gt: now } } } },
        { confirmedAt: { not: null } },
      ] },
      { OR: [
        teamSupervisorWhere(actor),
        { memberships: { some: { userId: actor.id, endedAt: null } } },
      ] },
    ],
  };
}
