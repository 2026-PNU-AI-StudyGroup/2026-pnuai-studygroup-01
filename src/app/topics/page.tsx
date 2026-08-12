import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ActiveProjectsView } from "@/app/topics/_components/active-projects-view";
import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import { ProgramAnnouncementRail } from "@/app/topics/_components/program-announcement-rail";
import { ProjectPortalHero } from "@/app/topics/_components/project-portal-chrome";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import { buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { hideGraduationProgramsForStudent } from "@/app/topics/_lib/hidden-graduation-programs";
import { resolveProgramSelection } from "@/app/topics/_lib/resolve-program-selection";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { isProjectRegistrationOpen } from "@/modules/project-program/domain/project-program-policy";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
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
  divisionId?: SearchParamValue;
};

type ProjectView = "active" | "past";

export default async function TopicsPage({ searchParams }: { searchParams: Promise<TopicsSearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const params = await searchParams;
  const view: ProjectView = firstSearchParam(params.view) === "past" ? "past" : "active";
  const now = new Date();
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const topicRepository = new PrismaTopicQueryRepository(prisma);
  const topicService = new ListPublishedTopicsService(topicRepository);
  const programService = new ProjectProgramService(new PrismaProjectProgramRepository(prisma));
  const archiveService = new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma));
  const votingService = new ProjectVotingService(new PrismaProjectVotingRepository(prisma));
  const announcementService = new AnnouncementService(new PrismaAnnouncementRepository(prisma));
  const listProgramAnnouncements = async (programId: string | undefined) => {
    if (!programId) return [];
    return announcementService.listForProgram(await resolveAnnouncementAudience(actor), programId);
  };
  let content: ReactNode;

  if (view === "past") {
    const requestedArchiveProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const [archive, sidebarProgramsRaw] = await Promise.all([
      archiveService.execute(requestedPage, 18, { query, programId: requestedArchiveProgramId }),
      programService.listSidebarVisible(now),
    ]);
    // 졸업과제는 다른 사이트로 이관 — 학생 탐색에서 졸업과제/캡스톤 프로그램 숨김.
    archive.programs = hideGraduationProgramsForStudent(archive.programs, actor.role);
    const sidebarPrograms = hideGraduationProgramsForStudent(sidebarProgramsRaw, actor.role);
    const programId = resolveProgramSelection(requestedArchiveProgramId, archive.programs);
    if (programId && programId !== requestedArchiveProgramId) {
      const target = new URLSearchParams({ view: "past", programId });
      if (query) target.set("q", query);
      if (requestedPage > 1) target.set("page", String(requestedPage));
      redirect(`/topics?${target.toString()}`);
    }
    const selectedProgram = archive.programs.find((program) => program.id === programId);
    const [ballot, programAnnouncements] = await Promise.all([
      programId ? votingService.getBallot(actor, programId) : Promise.resolve(undefined),
      listProgramAnnouncements(programId),
    ]);
    const sidebarItems = buildProgramSidebarItems(sidebarPrograms, archive.programs, "past", { query }, now);
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} />}>
        <ProjectPortalHero view="past" program={selectedProgram} search={<ProjectSearchForm view="past" programId={programId} query={query} />} />
        <ProgramAnnouncementRail announcements={programAnnouncements} />
        <PastProjectsView {...archive} query={query} programId={programId} ballot={ballot ?? undefined} />
      </ExplorerLayout>
    );
  } else {
    const [programsRaw, sidebarProgramsRaw] = await Promise.all([
      programService.listOpen(),
      programService.listSidebarVisible(now),
    ]);
    // 졸업과제는 다른 사이트로 이관 — 학생 탐색에서 졸업과제/캡스톤 프로그램 숨김.
    const programs = hideGraduationProgramsForStudent(programsRaw, actor.role);
    const sidebarPrograms = hideGraduationProgramsForStudent(sidebarProgramsRaw, actor.role);
    const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const programId = resolveProgramSelection(requestedProgramId, programs);
    const requestedDivisionId = firstSearchParam(params.divisionId)?.trim().slice(0, 200) || undefined;
    if (programId && programId !== requestedProgramId) {
      redirect(activeProjectsHref({ programId, query, page: requestedPage }));
    }
    const selectedProgram = programs.find((program) => program.id === programId);
    const divisionId = selectedProgram?.divisions?.some((division) => division.id === requestedDivisionId)
      ? requestedDivisionId
      : requestedDivisionId === "UNASSIGNED" && programId ? "UNASSIGNED" : undefined;
    if (requestedDivisionId && divisionId !== requestedDivisionId) redirect(activeProjectsHref({ programId, query, page: requestedPage }));
    const [topics, archivedProgramsRaw, leaderTeams, ballot, programAnnouncements] = await Promise.all([
      topicService.execute({ viewerId: actor.role === "STUDENT" ? actor.id : undefined, programId, divisionId, query, page: requestedPage, now }),
      archiveService.listPrograms(),
      actor.role === "STUDENT"
        ? new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id)
        : Promise.resolve([]),
      programId ? votingService.getBallot(actor, programId) : Promise.resolve(undefined),
      listProgramAnnouncements(programId),
    ]);
    const hasUnassigned = programId && selectedProgram?.divisions?.length
      ? Boolean(await prisma.topic.findFirst({ where: { programId, divisionId: null, status: "PUBLISHED" }, select: { id: true } }))
      : false;
    if (divisionId === "UNASSIGNED" && !hasUnassigned) {
      redirect(activeProjectsHref({ programId, query, page: requestedPage }));
    }
    const archivedPrograms = hideGraduationProgramsForStudent(archivedProgramsRaw, actor.role);
    const sidebarItems = buildProgramSidebarItems(sidebarPrograms, archivedPrograms, "active", { query }, now);
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} />}>
        <ProjectPortalHero
          view="active"
          program={selectedProgram}
          search={<ProjectSearchForm view="active" programId={programId} query={query} divisionId={divisionId} />}
          action={selectedProgram ? <>
            {actor.role === "STUDENT" && selectedProgram.studentProjectCreationEnabled && isProjectRegistrationOpen(selectedProgram, now)
              ? <Link className="button-primary" href={`/projects/new?programId=${encodeURIComponent(selectedProgram.id)}`}><UiText>{"프로젝트 제안"}</UiText></Link>
              : null}
          </> : undefined}
        />
        <ProgramAnnouncementRail announcements={programAnnouncements} />
        <ActiveProjectsView programId={programId} topics={topics} canApply={actor.role === "STUDENT"} leaderTeams={leaderTeams} query={query} divisionId={divisionId} divisions={selectedProgram?.divisions ?? []} hasUnassigned={hasUnassigned} now={now} ballot={ballot ?? undefined} />
      </ExplorerLayout>
    );
  }

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">{content}</AppShell>;
}
