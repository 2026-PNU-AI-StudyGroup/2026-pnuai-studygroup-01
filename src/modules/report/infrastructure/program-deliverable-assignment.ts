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
  const team = await transaction.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      programId: true,
      status: true,
      topic: {
        select: {
          divisionId: true,
          division: { select: { rubricMode: true } },
        },
      },
    },
  });
  if (!team || team.status === "CLOSED") return;

  const reportDefinitions = await transaction.programReportDefinition.findMany({
    where: { programId: team.programId, archivedAt: null },
    select: { id: true, title: true, dueAt: true },
  });
  if (reportDefinitions.length) {
    await transaction.report.createMany({
      data: reportDefinitions.map((definition) => ({
        teamId: team.id,
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

  const custom = team.topic.divisionId != null && team.topic.division?.rubricMode === "CUSTOM";
  const rubrics = await transaction.rubricDefinition.findMany({
    where: {
      programId: team.programId,
      archivedAt: null,
      legacy: false,
      divisionId: custom ? team.topic.divisionId : null,
    },
    select: { id: true },
  });
  if (rubrics.length) {
    await transaction.teamRubricEvaluation.createMany({
      data: rubrics.map((rubric) => ({ teamId: team.id, rubricId: rubric.id, createdAt: assignedAt })),
      skipDuplicates: true,
    });
  }
}
