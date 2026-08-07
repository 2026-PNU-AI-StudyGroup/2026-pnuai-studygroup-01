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
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import { buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { resolveProgramSelection } from "@/app/topics/_lib/resolve-program-selection";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { isProjectRegistrationOpen } from "@/modules/project-program/domain/project-program-policy";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import type { PublicTopicPhase, PublicTopicSort } from "@/modules/topic/application/topic-ports";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 찾기");
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
  const votingService = new ProjectVotingService(new PrismaProjectVotingRepository(prisma));
  let content: ReactNode;

  if (view === "past") {
    const requestedArchiveProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const [archive, sidebarPrograms] = await Promise.all([
      archiveService.execute(requestedPage, 20, { query, programId: requestedArchiveProgramId }),
      programService.listSidebarVisible(now),
    ]);
    const programId = resolveProgramSelection(requestedArchiveProgramId, archive.programs);
    if (programId && programId !== requestedArchiveProgramId) {
      const target = new URLSearchParams({ view: "past", programId });
      if (query) target.set("q", query);
      if (requestedPage > 1) target.set("page", String(requestedPage));
      redirect(`/topics?${target.toString()}`);
    }
    const selectedProgram = archive.programs.find((program) => program.id === programId);
    const ballot = programId ? await votingService.getBallot(actor, programId) : undefined;
    const sidebarItems = buildProgramSidebarItems(sidebarPrograms, archive.programs, "past", { query }, now);
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} />}>
        <ProjectPortalHero view="past" program={selectedProgram} />
        <PastProjectsView {...archive} query={query} programId={programId} ballot={ballot ?? undefined} />
      </ExplorerLayout>
    );
  } else {
    const [programs, sidebarPrograms] = await Promise.all([
      programService.listOpen(),
      programService.listSidebarVisible(now),
    ]);
    const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const programId = resolveProgramSelection(requestedProgramId, programs);
    if (programId && programId !== requestedProgramId) {
      redirect(activeProjectsHref({ phase, programId, query, sort, page: requestedPage }));
    }
    const [topics, archivedPrograms, leaderTeams, ballot] = await Promise.all([
      topicService.execute({ viewerId: actor.role === "STUDENT" ? actor.id : undefined, programId, query, phase, sort, page: requestedPage, now }),
      archiveService.listPrograms(),
      actor.role === "STUDENT"
        ? new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id)
        : Promise.resolve([]),
      programId ? votingService.getBallot(actor, programId) : Promise.resolve(undefined),
    ]);
    const selectedProgram = programs.find((program) => program.id === programId);
    const sidebarItems = buildProgramSidebarItems(sidebarPrograms, archivedPrograms, "active", { query, phase, sort }, now);
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} />}>
        <ProjectPortalHero
          view="active"
          program={selectedProgram}
          action={selectedProgram ? <>
            {actor.role === "STUDENT" && selectedProgram.studentProjectCreationEnabled && isProjectRegistrationOpen(selectedProgram, now)
              ? <Link className="button-primary" href={`/projects/new?programId=${encodeURIComponent(selectedProgram.id)}`}><UiText>{"프로젝트 제안"}</UiText></Link>
              : null}
          </> : undefined}
        />
        <ActiveProjectsView programId={programId} topics={topics} canApply={actor.role === "STUDENT"} leaderTeams={leaderTeams} phase={phase} query={query} sort={sort} now={now} ballot={ballot} />
      </ExplorerLayout>
    );
  }

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">{content}</AppShell>;
}
