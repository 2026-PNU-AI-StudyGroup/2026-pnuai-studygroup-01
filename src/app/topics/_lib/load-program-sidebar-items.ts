import { buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import type { ProgramSidebarItem } from "@/app/topics/_components/program-sidebar";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function loadProgramSidebarItems(
  view: "active" | "past" = "active",
): Promise<ProgramSidebarItem[]> {
  const [openPrograms, archivedPrograms] = await Promise.all([
    new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen(),
    new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma)).listPrograms(),
  ]);
  return buildProgramSidebarItems(openPrograms, archivedPrograms, view);
}
