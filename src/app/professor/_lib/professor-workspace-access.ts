import { redirect } from "next/navigation";

import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectAssistantQueryService } from "@/modules/project-assistant/application/manage-project-assistants";
import { PrismaProjectAssistantRepository } from "@/modules/project-assistant/infrastructure/prisma-project-assistant-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function requireProfessorWorkspaceActor(): Promise<CurrentUser> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const canAccess = await new ProjectAssistantQueryService(
    new PrismaProjectAssistantRepository(prisma),
  ).canAccessProfessorWorkspace(actor);
  if (!canAccess) redirect("/dashboard");

  return actor;
}
