import { notFound, permanentRedirect } from "next/navigation";

import { prisma } from "@/shared/infrastructure/database/prisma";

export async function redirectLegacyProjectTeamRoute(projectTeamId: string, suffix = ""): Promise<never> {
  const team = await prisma.projectTeam.findUnique({
    where: { id: projectTeamId },
    select: { projectId: true },
  });
  if (!team) notFound();
  return permanentRedirect(`/projects/${team.projectId}${suffix}`);
}
