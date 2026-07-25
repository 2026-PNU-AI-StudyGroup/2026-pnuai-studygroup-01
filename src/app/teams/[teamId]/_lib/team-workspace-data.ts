import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ReportOperationNotAllowedError, ReportQueryService } from "@/modules/report/application/manage-reports";
import { PrismaReportQueryRepository } from "@/modules/report/infrastructure/prisma-report-query-repository";
import { TeamNotFoundError, TeamWorkspaceQueryService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceQueryRepository } from "@/modules/team/infrastructure/prisma-team-workspace-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const loadTeamWorkspace = cache(async (teamId: string, discussionPage = 1) => {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  try {
    const workspace = await new TeamWorkspaceQueryService(
      new PrismaTeamWorkspaceQueryRepository(prisma),
    ).get(actor, teamId, discussionPage);
    return { actor, workspace };
  } catch (error) {
    if (error instanceof TeamNotFoundError) notFound();
    throw error;
  }
});

export const loadTeamReportWorkspace = cache(async (teamId: string) => {
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  try {
    const reportWorkspace = await new ReportQueryService(
      new PrismaReportQueryRepository(prisma),
    ).get(actor, teamId);
    return { actor, workspace, reportWorkspace };
  } catch (error) {
    if (error instanceof ReportOperationNotAllowedError) notFound();
    throw error;
  }
});
