import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ActiveProjectsView } from "@/app/topics/_components/active-projects-view";
import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import { ProjectPortalHero } from "@/app/topics/_components/project-portal-chrome";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 탐색");
}

type TopicsSearchParams = {
  view?: SearchParamValue;
  programId?: SearchParamValue;
  page?: SearchParamValue;
  q?: SearchParamValue;
  phase?: SearchParamValue;
  sort?: SearchParamValue;
};

type ProjectView = "active" | "past";

export default async function TopicsPage({ searchParams }: { searchParams: Promise<TopicsSearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const params = await searchParams;
  const view: ProjectView = firstSearchParam(params.view) === "past" ? "past" : "active";
  const now = new Date();
  const requestedPhase = firstSearchParam(params.phase);
  const phase: PublicTopicPhase = requestedPhase === "RECRUITING" || requestedPhase === "CLOSING_SOON" ? requestedPhase : "ACTIVE";
  const sort: PublicTopicSort = firstSearchParam(params.sort) === "DEADLINE" ? "DEADLINE" : "LATEST";
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const topicRepository = new PrismaTopicQueryRepository(prisma);
  const topicService = new ListPublishedTopicsService(topicRepository);
  const programService = new ProjectProgramService(new PrismaProjectProgramRepository(prisma));
  const archiveService = new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma));
  let content: ReactNode;

  if (view === "past") {
    const requestedArchiveProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const [archive, openPrograms] = await Promise.all([
      archiveService.execute(requestedPage, 20, { query, programId: requestedArchiveProgramId }),
      programService.listOpen(),
    ]);
    const programId = archive.programs.some((program) => program.id === requestedArchiveProgramId) ? requestedArchiveProgramId : undefined;
    const selectedProgram = archive.programs.find((program) => program.id === programId);
    const sidebarItems = buildProgramSidebarItems(openPrograms, archive.programs, "past");
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} allHref="/topics?view=past" />}>
        <ProjectPortalHero view="past" program={selectedProgram} />
        <PastProjectsView {...archive} query={query} programId={programId} />
      </ExplorerLayout>
    );
  } else {
    const programs = await programService.listOpen();
    const requestedProgramId = firstSearchParam(params.programId);
    const programId = requestedProgramId && requestedProgramId.length <= 200 && programs.some((program) => program.id === requestedProgramId) ? requestedProgramId : undefined;
    const [topics, archivedPrograms, leaderTeams] = await Promise.all([
      topicService.execute({ viewerId: actor.role === "STUDENT" ? actor.id : undefined, programId, query, phase, sort, page: requestedPage, now }),
      archiveService.listPrograms(),
      actor.role === "STUDENT"
        ? new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id)
        : Promise.resolve([]),
    ]);
    const selectedProgram = programs.find((program) => program.id === programId);
    const sidebarItems = buildProgramSidebarItems(programs, archivedPrograms);
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} allHref="/topics" />}>
        <ProjectPortalHero
          view="active"
          program={selectedProgram}
          action={actor.role === "STUDENT" && selectedProgram?.studentProjectCreationEnabled
            ? <Link className="button-primary" href={`/projects/new?programId=${encodeURIComponent(selectedProgram.id)}`}><UiText>{"프로젝트 만들기"}</UiText></Link>
            : undefined}
        />
        <ActiveProjectsView programId={programId} topics={topics} canApply={actor.role === "STUDENT"} leaderTeams={leaderTeams} phase={phase} query={query} sort={sort} now={now} programOrder={programs.map((program) => program.id)} />
      </ExplorerLayout>
    );
  }

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">{content}</AppShell>;
}
