import type { PrismaClient } from "@/generated/prisma/client";

export type ProgramReportCellState =
  | "APPROVED"
  | "REVISION_REQUESTED"
  | "PENDING_REVIEW"
  | "OVERDUE"
  | "NOT_SUBMITTED";

export type ProgramReportMatrix = {
  columns: Array<{ id: string; title: string; dueAt: Date; required: boolean }>;
  rows: Array<{
    teamId: string;
    projectId: string;
    projectTitle: string;
    teamName: string;
    /** 보고서 칸 id 별 상태. 팀이 꾸려지기 전에 정한 보고서처럼 팀에 없는 칸은 비어 있다. */
    cells: Record<string, ProgramReportCellState>;
  }>;
};

/**
 * 팀 x 보고서 표.
 *
 * "어느 팀이 중간 보고서를 안 냈지?"에 답하려면 지금은 팀 작업 공간을 하나씩 열어야 했다.
 * 프로그램의 팀을 한 줄씩, 보고서를 한 칸씩 놓고 마지막 버전의 상태를 적는다.
 */
export async function programReportMatrix(client: PrismaClient, programId: string, now: Date): Promise<ProgramReportMatrix> {
  const [definitions, teams] = await Promise.all([
    client.programReportDefinition.findMany({
      where: { programId, archivedAt: null },
      orderBy: { position: "asc" },
      select: { id: true, title: true, dueAt: true, required: true },
    }),
    client.projectTeam.findMany({
      where: { project: { programId, status: "ACTIVE" } },
      orderBy: { project: { title: "asc" } },
      select: {
        id: true,
        name: true,
        project: { select: { id: true, title: true } },
        reports: {
          select: {
            definitionId: true,
            dueAt: true,
            versions: { orderBy: { version: "desc" }, take: 1, select: { decision: { select: { decision: true } } } },
          },
        },
      },
    }),
  ]);

  return {
    columns: definitions,
    rows: teams.map((team) => ({
      teamId: team.id,
      projectId: team.project.id,
      projectTitle: team.project.title,
      teamName: team.name,
      cells: Object.fromEntries(team.reports.map((report) => {
        const latest = report.versions[0];
        const state: ProgramReportCellState = latest
          ? latest.decision?.decision ?? "PENDING_REVIEW"
          : report.dueAt.getTime() < now.getTime() ? "OVERDUE" : "NOT_SUBMITTED";
        return [report.definitionId, state];
      })),
    })),
  };
}
