import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ActiveProjectsView } from "@/app/topics/_components/active-projects-view";
import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import { ProjectPortalHero } from "@/app/topics/_components/project-portal-chrome";
import { ProjectExplorerLayout, type ProjectView } from "@/app/topics/_components/project-explorer-layout";
import { ProjectViewTabs } from "@/app/topics/_components/project-view-tabs";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveRepository } from "@/modules/team/infrastructure/prisma-team-archive-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export const metadata: Metadata = { title: "프로젝트 탐색" };

type TopicsSearchParams = {
  view?: SearchParamValue;
  programId?: SearchParamValue;
  page?: SearchParamValue;
  q?: SearchParamValue;
  category?: SearchParamValue;
  phase?: SearchParamValue;
  sort?: SearchParamValue;
};

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
  const topicRepository = new PrismaTopicRepository(prisma);
  const topicService = new ListPublishedTopicsService(topicRepository);
  const applicationService = new ListOwnTopicApplicationsService(new PrismaTopicApplicationRepository(prisma));
  let content: ReactNode;

  if (view === "past") {
    const category = firstSearchParam(params.category)?.trim().slice(0, 100) ?? "";
    const requestedArchiveProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const archive = await new ListArchivedProjectsService(new PrismaTeamArchiveRepository(prisma)).execute(requestedPage, 20, { query, programId: requestedArchiveProgramId, programCategory: category });
    const programId = archive.programs.some((program) => program.id === requestedArchiveProgramId) ? requestedArchiveProgramId : undefined;
    content = <div className="pt-7"><PastProjectsView {...archive} query={query} programId={programId} /></div>;
  } else {
    const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen();
    const requestedProgramId = firstSearchParam(params.programId);
    const programId = requestedProgramId && requestedProgramId.length <= 200 && programs.some((program) => program.id === requestedProgramId) ? requestedProgramId : undefined;
    const [topics, applications, teamApplicationState] = await Promise.all([
      topicService.execute({ viewerId: actor.role === "STUDENT" ? actor.id : undefined, programId, query, phase, sort, page: requestedPage, now }),
      actor.role === "STUDENT" ? applicationService.execute(actor, 1, 2) : Promise.resolve(undefined),
      actor.role === "STUDENT" ? new TeamApplicationInvitationService(new PrismaTopicApplicationRepository(prisma)).list(actor) : Promise.resolve(undefined),
    ]);
    content = <ActiveProjectsView programs={programs} programId={programId} topics={topics} applications={applications} pendingTeamTopicIds={teamApplicationState?.drafts.map(({ topicId }) => topicId) ?? []} phase={phase} query={query} sort={sort} now={now} />;
  }

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics"><ProjectExplorerLayout><ProjectPortalHero view={view} /><ProjectViewTabs view={view} query={query} />{content}</ProjectExplorerLayout></AppShell>;
}
