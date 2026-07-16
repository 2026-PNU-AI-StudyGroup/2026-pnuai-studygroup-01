import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ActiveProjectsView } from "@/app/topics/active-projects-view";
import { PastProjectsView } from "@/app/topics/past-projects-view";
import { ProjectExplorerLayout, type ProjectView } from "@/app/topics/project-explorer-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveRepository } from "@/modules/team/infrastructure/prisma-team-archive-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

type TopicsSearchParams = {
  view?: SearchParamValue;
  programId?: SearchParamValue;
  page?: SearchParamValue;
  q?: SearchParamValue;
  year?: SearchParamValue;
  category?: SearchParamValue;
};

export default async function TopicsPage({ searchParams }: { searchParams: Promise<TopicsSearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const params = await searchParams;
  const view: ProjectView = firstSearchParam(params.view) === "past" ? "past" : "active";
  let content: ReactNode;

  if (view === "past") {
    const requestedPage = Number(firstSearchParam(params.page) ?? "1");
    const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
    const category = firstSearchParam(params.category)?.trim().slice(0, 100) ?? "";
    const requestedYear = Number(firstSearchParam(params.year));
    const academicYear = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 9999 ? requestedYear : undefined;
    const archive = await new ListArchivedProjectsService(new PrismaTeamArchiveRepository(prisma)).execute(requestedPage, 20, {
      query,
      academicYear,
      programCategory: category,
    });
    content = <PastProjectsView {...archive} query={query} academicYear={academicYear} category={category} />;
  } else {
    const topicRepository = new PrismaTopicRepository(prisma);
    const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen();
    const requestedProgramId = firstSearchParam(params.programId);
    const programId = requestedProgramId && requestedProgramId.length <= 200 && programs.some((program) => program.id === requestedProgramId) ? requestedProgramId : undefined;
    const [topics, applications] = await Promise.all([
      new ListPublishedTopicsService(topicRepository).execute(programId),
      actor.role === "STUDENT" ? new ListOwnTopicApplicationsService(new PrismaTopicApplicationRepository(prisma)).execute(actor) : Promise.resolve([]),
    ]);
    content = <ActiveProjectsView actor={actor} programs={programs} programId={programId} topics={topics} applications={applications} now={new Date()} />;
  }

  return <AppShell role={actor.role} userName="부산대학교" currentPath="/topics"><ProjectExplorerLayout role={actor.role} view={view}>{content}</ProjectExplorerLayout></AppShell>;
}
