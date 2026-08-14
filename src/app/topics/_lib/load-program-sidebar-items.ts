import { buildProgramSidebarItems, type ProgramSidebarQuery } from "@/app/topics/_lib/program-sidebar-items";
import type { ProgramSidebarItem } from "@/app/topics/_components/program-sidebar";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function loadProgramSidebarItems(
  view: "active" | "past" = "active",
  query: ProgramSidebarQuery = {},
  audience: "STUDENT" | "FACULTY" | "ADMIN" = "STUDENT",
): Promise<ProgramSidebarItem[]> {
  const now = new Date();
  const [sidebarPrograms, archivedPrograms] = await Promise.all([
    audience === "ADMIN"
      ? new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listAll({ id: "sidebar", role: "ADMIN" })
      : new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listSidebarVisible(now),
    new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma, audience)).listPrograms(),
  ]);
  return buildProgramSidebarItems(sidebarPrograms, archivedPrograms, view, query, now);
}
