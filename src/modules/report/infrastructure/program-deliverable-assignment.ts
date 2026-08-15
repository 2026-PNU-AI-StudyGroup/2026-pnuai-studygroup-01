import type { Prisma } from "@/generated/prisma/client";

/**
 * Attaches the current program report/rubric definitions to one team.
 * Callers must hold the program row lock before invoking this helper.
 */
export async function assignProgramDeliverablesToTeam(
  transaction: Prisma.TransactionClient,
  teamId: string,
  assignedAt: Date,
) {
  const team = await transaction.projectTeam.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      project: {
        select: {
          programId: true,
          status: true,
          divisionId: true,
          division: { select: { rubricMode: true } },
        },
      },
    },
  });
  if (!team || team.project.status !== "ACTIVE") return;

  const reportDefinitions = await transaction.programReportDefinition.findMany({
    where: { programId: team.project.programId, archivedAt: null },
    select: { id: true, title: true, dueAt: true },
  });
  if (reportDefinitions.length) {
    await transaction.report.createMany({
      data: reportDefinitions.map((definition) => ({
        projectTeamId: team.id,
        definitionId: definition.id,
        titleSnapshot: definition.title,
        dueAt: definition.dueAt,
        required: true,
        createdAt: assignedAt,
        updatedAt: assignedAt,
      })),
      skipDuplicates: true,
    });
  }

  const custom = team.project.divisionId != null && team.project.division?.rubricMode === "CUSTOM";
  const rubrics = await transaction.rubricDefinition.findMany({
    where: {
      programId: team.project.programId,
      archivedAt: null,
      legacy: false,
      divisionId: custom ? team.project.divisionId : null,
    },
    select: { id: true },
  });
  if (rubrics.length) {
    await transaction.projectTeamRubricEvaluation.createMany({
      data: rubrics.map((rubric) => ({ projectTeamId: team.id, rubricId: rubric.id, createdAt: assignedAt })),
      skipDuplicates: true,
    });
  }
}
