import { buildProgramSidebarItems, type ProgramSidebarQuery } from "@/app/topics/_lib/program-sidebar-items";
import { hideGraduationProgramsForStudent } from "@/app/topics/_lib/hidden-graduation-programs";
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
  // 졸업과제는 다른 사이트로 옮겼다. 탐색 화면에서는 학생에게 숨기면서 여기서는 숨기지
  // 않아, 프로젝트 상세 옆 목록에만 남아 있었다. 눌러도 후보에 없어 다른 프로그램으로 튕긴다.
  const role = audience === "STUDENT" ? "STUDENT" : audience;
  return buildProgramSidebarItems(
    hideGraduationProgramsForStudent(sidebarPrograms, role),
    hideGraduationProgramsForStudent(archivedPrograms, role),
    view,
    query,
    now,
  );
}
