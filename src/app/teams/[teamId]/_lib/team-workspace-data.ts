import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ReportOperationNotAllowedError, ReportService } from "@/modules/report/application/manage-reports";
import { PrismaReportRepository } from "@/modules/report/infrastructure/prisma-report-repository";
import { TeamNotFoundError, TeamWorkspaceService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceRepository } from "@/modules/team/infrastructure/prisma-team-workspace-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const loadTeamWorkspace = cache(async (teamId: string, discussionPage = 1) => {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const repository = new PrismaTeamWorkspaceRepository(prisma);
  try {
    const workspace = await new TeamWorkspaceService(repository, repository, repository).get(actor, teamId, discussionPage);
    return { actor, workspace };
  } catch (error) {
    if (error instanceof TeamNotFoundError) notFound();
    throw error;
  }
});

export const loadTeamReportWorkspace = cache(async (teamId: string) => {
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  try {
    const reportWorkspace = await new ReportService(new PrismaReportRepository(prisma)).get(actor, teamId);
    return { actor, workspace, reportWorkspace };
  } catch (error) {
    if (error instanceof ReportOperationNotAllowedError) notFound();
    throw error;
  }
});
