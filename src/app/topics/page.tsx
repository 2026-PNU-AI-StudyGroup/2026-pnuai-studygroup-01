import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ActiveProjectsView } from "@/app/topics/_components/active-projects-view";
import { AdminProjectOperationsSummary } from "@/app/topics/_components/admin-project-operations-summary";
import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import { ProgramAnnouncementRail } from "@/app/topics/_components/program-announcement-rail";
import { ProjectPortalHero } from "@/app/topics/_components/project-portal-chrome";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { ProjectProposalModal } from "@/app/topics/_components/project-proposal-modal";
import { StudentProjectRegistrationLink } from "@/app/topics/_components/student-project-registration-link";
import { activeProjectsHref } from "@/app/topics/_lib/active-project-query";
import { buildAdminProgramSidebarItems, buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { hideGraduationProgramsForStudent } from "@/app/topics/_lib/hidden-graduation-programs";
import { resolveProgramSelection } from "@/app/topics/_lib/resolve-program-selection";
import {
  AnnouncementService,
  canWriteAnnouncementTarget,
} from "@/modules/announcement/application/manage-announcements";
import { canCreateAnnouncement } from "@/modules/announcement/domain/announcement-policy";
import { ProgramAnnouncementCreateModal } from "@/modules/announcement/ui/program-announcement-create-modal";
import { createProgramAnnouncementAction } from "@/app/topics/_actions/create-program-announcement-action";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ProgramCreateWorkspace, ProgramManagementWorkspace } from "@/app/topics/_management/program-management-workspace";
import { parseProgramManagementTab, programManagementHref } from "@/modules/project-program/ui/program-management-query";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { ListAdminTopicPreviewService } from "@/modules/topic/application/list-admin-topic-preview";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { ListAdminProjectOverviewService } from "@/modules/team/application/list-admin-project-overview";
import { ListAdminProjectCardDataService } from "@/modules/team/application/list-admin-project-card-data";
import {
  ListAdminProgramProjectOperationsService,
  parseAdminProjectOperationFilter,
} from "@/modules/team/application/list-admin-program-project-operations";
import { PrismaAdminProjectCardDataReader } from "@/modules/team/infrastructure/prisma-admin-project-card-data-reader";
import { PrismaAdminProgramProjectOperationsReader } from "@/modules/team/infrastructure/prisma-admin-program-project-operations-reader";
import { PrismaAdminProjectOverviewReader } from "@/modules/team/infrastructure/prisma-admin-project-overview-reader";
import { parseAdminProjectPage, parseAdminProjectProgressFilter } from "@/modules/team/ui/admin-project-overview-query";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { SettingsIcon } from "@/shared/ui/workspace-icons";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 찾기");
}

type TopicsSearchParams = {
  view?: SearchParamValue;
  programId?: SearchParamValue;
  page?: SearchParamValue;
  q?: SearchParamValue;
  divisionId?: SearchParamValue;
  modal?: SearchParamValue;
  mode?: SearchParamValue;
  tab?: SearchParamValue;
  progress?: SearchParamValue;
  operation?: SearchParamValue;
};

type ProjectView = "active" | "past";

function ProgramManageLink({ programId, programName }: {
  programId: string;
  programName: string;
}) {
  return (
    <Link
      href={programManagementHref(programId)}
      aria-label={`${programName} 관리`}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)] focus-visible:bg-[var(--surface-subtle)] focus-visible:text-[var(--primary)]"
    >
      <SettingsIcon className="size-[1.1rem]" />
    </Link>
  );
}

export default async function TopicsPage({ searchParams }: { searchParams: Promise<TopicsSearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const params = await searchParams;
  const view: ProjectView = firstSearchParam(params.view) === "past" ? "past" : "active";
  const requestedMode = firstSearchParam(params.mode);
  const mode: "projects" | "manage" | "create" = actor.role === "ADMIN" && requestedMode === "manage"
    ? "manage"
    : actor.role === "ADMIN" && requestedMode === "create"
      ? "create"
      : "projects";
  const managementTab = parseProgramManagementTab(firstSearchParam(params.tab));
  const now = new Date();
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const operation = actor.role === "ADMIN"
    ? parseAdminProjectOperationFilter(firstSearchParam(params.operation))
    : undefined;
  const proposalRequested = actor.role === "STUDENT" && firstSearchParam(params.modal) === "project-proposal";
  const topicAudience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const topicRepository = new PrismaTopicQueryRepository(prisma, topicAudience);
  const topicService = new ListPublishedTopicsService(topicRepository);
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const programService = new ProjectProgramService(programRepository);
  const archiveAudience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const archiveService = new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma, archiveAudience));
  const votingService = new ProjectVotingService(new PrismaProjectVotingRepository(prisma));
  const adminProjectCardDataService = new ListAdminProjectCardDataService(
    new PrismaAdminProjectCardDataReader(prisma),
  );
  const adminProgramProjectOperationsService = new ListAdminProgramProjectOperationsService(
    new PrismaAdminProgramProjectOperationsReader(prisma),
    () => now,
  );
  const announcementService = new AnnouncementService(new PrismaAnnouncementRepository(prisma));
  const announcementAudiencePromise = resolveAnnouncementAudience(actor);
  const listProgramAnnouncements = async (programId: string | undefined) => {
    if (!programId) return [];
    return announcementService.listForProgram(await announcementAudiencePromise, programId);
  };
  const programAnnouncementCreateHref = async (programId: string | undefined, closeHref: string) => {
    if (!programId || !canCreateAnnouncement(actor.role)) return undefined;
    const audience = await announcementAudiencePromise;
    if (!canWriteAnnouncementTarget(actor, audience, { teamId: null, programId })) return undefined;
    return `${closeHref}${closeHref.includes("?") ? "&" : "?"}modal=announcement-new`;
  };
  let content: ReactNode;

  const [adminPrograms, adminOverviewPrograms] = actor.role === "ADMIN"
    ? await Promise.all([
        programService.listAll(actor),
        mode === "manage" && managementTab === "overview"
          ? new ListAdminProjectOverviewService(new PrismaAdminProjectOverviewReader(prisma)).execute(actor)
          : Promise.resolve([]),
      ])
    : [undefined, []];

  if (actor.role === "ADMIN" && (mode === "manage" || mode === "create")) {
    const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const defaultProgram = adminPrograms?.find(({ endsAt }) => endsAt > now) ?? adminPrograms?.[0];
    const programId = adminPrograms?.some(({ id }) => id === requestedProgramId) ? requestedProgramId : defaultProgram?.id;
    const createCancelHref = defaultProgram ? programManagementHref(defaultProgram.id) : "/topics";
    if (mode === "manage" && programId && programId !== requestedProgramId) redirect(programManagementHref(programId, managementTab));
    const sidebarItems = buildAdminProgramSidebarItems(adminPrograms ?? [], mode, managementTab, now);
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={mode === "create" ? undefined : programId} title="프로그램 관리" showSettings />}>
        {mode === "create" ? (
          <ProgramCreateWorkspace cancelHref={createCancelHref} />
        ) : programId ? (
          <ProgramManagementWorkspace
            actor={actor}
            programId={programId}
            tab={managementTab}
            overviewPrograms={adminOverviewPrograms}
            selectedProgress={parseAdminProjectProgressFilter(firstSearchParam(params.progress))}
            requestedPage={parseAdminProjectPage(firstSearchParam(params.page))}
          />
        ) : (
          <ProgramCreateWorkspace cancelHref={createCancelHref} />
        )}
      </ExplorerLayout>
    );
    const currentPath = mode === "create" || managementTab !== "overview" ? "/admin/programs" : "/dashboard";
    return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={currentPath}>{content}</AppShell>;
  }

  if (view === "past") {
    const requestedArchiveProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const [archive, sidebarProgramsRaw] = await Promise.all([
      archiveService.execute(requestedPage, 18, { query, programId: requestedArchiveProgramId }),
      programService.listSidebarVisible(now, actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT"),
    ]);
    // 졸업과제는 다른 사이트로 이관 — 학생 탐색에서 졸업과제/캡스톤 프로그램 숨김.
    archive.programs = hideGraduationProgramsForStudent(archive.programs, actor.role);
    const sidebarPrograms = hideGraduationProgramsForStudent(sidebarProgramsRaw, actor.role);
    // 종료된 프로그램은 사이드바(공개 프로그램)엔 있지만 아카이브 목록(닫힌 팀 보유 프로그램)엔
    // 없을 수 있다. 선택 후보를 둘의 합집합으로 넓혀야 클릭 시 다른 프로그램으로 튕기지 않는다.
    const adminClosedPrograms = adminPrograms?.filter((program) => program.endsAt <= now) ?? [];
    const programId = resolveProgramSelection(requestedArchiveProgramId, actor.role === "ADMIN" ? adminClosedPrograms : [...archive.programs, ...sidebarPrograms]);
    if (programId && programId !== requestedArchiveProgramId) {
      const target = new URLSearchParams({ view: "past", programId });
      if (query) target.set("q", query);
      if (requestedPage > 1) target.set("page", String(requestedPage));
      redirect(`/topics?${target.toString()}`);
    }
    const selectedProgram = adminPrograms?.find((program) => program.id === programId)
      ?? archive.programs.find((program) => program.id === programId)
      ?? sidebarPrograms.find((program) => program.id === programId);
    const closeAnnouncementHref = (() => {
      const target = new URLSearchParams({ view: "past" });
      if (programId) target.set("programId", programId);
      if (query) target.set("q", query);
      if (requestedPage > 1) target.set("page", String(requestedPage));
      return `/topics?${target.toString()}`;
    })();
    const [ballot, votingResults, programAnnouncements, announcementCreateHref] = await Promise.all([
      programId ? votingService.getBallot(actor, programId) : Promise.resolve(undefined),
      actor.role === "ADMIN" && programId ? votingService.getResults(actor, programId) : Promise.resolve(null),
      listProgramAnnouncements(programId),
      programAnnouncementCreateHref(programId, closeAnnouncementHref),
    ]);
    const adminProjectData = actor.role === "ADMIN"
      ? await adminProjectCardDataService.execute(actor, archive.projects.map(({ topicId }) => topicId))
      : undefined;
    const sidebarItems = actor.role === "ADMIN"
      ? buildAdminProgramSidebarItems(adminPrograms ?? [], "projects", managementTab, now)
      : buildProgramSidebarItems(sidebarPrograms, archive.programs, "past", { query }, now);
    const manageAction = actor.role === "ADMIN" && programId && selectedProgram
      ? <ProgramManageLink programId={programId} programName={selectedProgram.name} />
      : undefined;
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} />}>
        <ProjectPortalHero view="past" program={selectedProgram} search={<ProjectSearchForm view="past" programId={programId} query={query} />} titleAction={manageAction} />
        <ProgramAnnouncementRail
          announcements={programAnnouncements}
          createHref={announcementCreateHref}
          manageableAnnouncementIds={programAnnouncements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id)}
          returnHref={closeAnnouncementHref}
        />
        <PastProjectsView {...archive} query={query} programId={programId} ballot={ballot ?? undefined} votingResults={votingResults ?? undefined} adminProjectData={adminProjectData} />
        {firstSearchParam(params.modal) === "announcement-new" && announcementCreateHref && programId && selectedProgram ? <ProgramAnnouncementCreateModal programId={programId} programName={selectedProgram.name} closeHref={closeAnnouncementHref} createAction={createProgramAnnouncementAction} /> : null}
      </ExplorerLayout>
    );
  } else {
    const [programsRaw, sidebarProgramsRaw] = await Promise.all([
      actor.role === "ADMIN" ? programService.listAll(actor) : programService.listPublic(actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT"),
      programService.listSidebarVisible(now, actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT"),
    ]);
    // 졸업과제는 다른 사이트로 이관 — 학생 탐색에서 졸업과제/캡스톤 프로그램 숨김.
    const programs = actor.role === "ADMIN"
      ? (adminPrograms ?? []).filter((program) => program.endsAt > now)
      : hideGraduationProgramsForStudent(programsRaw, actor.role);
    const sidebarPrograms = hideGraduationProgramsForStudent(sidebarProgramsRaw, actor.role);
    const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const programId = resolveProgramSelection(requestedProgramId, programs);
    const requestedDivisionId = firstSearchParam(params.divisionId)?.trim().slice(0, 200) || undefined;
    if (programId && programId !== requestedProgramId) {
      redirect(activeProjectsHref({ programId, query, operation, page: requestedPage }));
    }
    const selectedProgram = programs.find((program) => program.id === programId);
    const divisionId = selectedProgram?.divisions?.some((division) => division.id === requestedDivisionId)
      ? requestedDivisionId
      : requestedDivisionId === "UNASSIGNED" && programId ? "UNASSIGNED" : undefined;
    if (requestedDivisionId && divisionId !== requestedDivisionId) redirect(activeProjectsHref({ programId, query, operation, page: requestedPage }));
    const closeProposalHref = activeProjectsHref({ programId, divisionId, query, operation, page: requestedPage });
    const operations = actor.role === "ADMIN" && programId
      ? await adminProgramProjectOperationsService.execute(actor, programId, operation ?? "all")
      : undefined;
    const [topics, archivedProgramsRaw, leaderTeams, ballot, votingResults, programAnnouncements, announcementCreateHref, proposalPrograms, proposalProfessors] = await Promise.all([
      actor.role === "ADMIN"
        ? new ListAdminTopicPreviewService(topicRepository).execute(actor, { programId, divisionId, query, page: requestedPage, now, topicIds: operations?.matchingTopicIds })
        : topicService.execute({ viewerId: actor.role === "STUDENT" ? actor.id : undefined, programId, divisionId, query, page: requestedPage, now }),
      archiveService.listPrograms(),
      actor.role === "STUDENT"
        ? new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id)
        : Promise.resolve([]),
      programId ? votingService.getBallot(actor, programId) : Promise.resolve(undefined),
      actor.role === "ADMIN" && programId ? votingService.getResults(actor, programId) : Promise.resolve(null),
      listProgramAnnouncements(programId),
      programAnnouncementCreateHref(programId, closeProposalHref),
      proposalRequested ? programService.listStudentCreatableOpen() : Promise.resolve([]),
      proposalRequested
        ? new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), programRepository).listProfessors()
        : Promise.resolve([]),
    ]);
    const adminProjectData = actor.role === "ADMIN"
      ? await adminProjectCardDataService.execute(actor, topics.items.map(({ id }) => id))
      : undefined;
    const hasUnassigned = programId && selectedProgram?.divisions?.length
      ? Boolean(await prisma.topic.findFirst({ where: { programId, divisionId: null, status: "ACTIVE" }, select: { id: true } }))
      : false;
    if (proposalRequested && proposalPrograms.length && !proposalPrograms.some(({ id }) => id === programId)) {
      const proposalProgramHref = activeProjectsHref({ programId: proposalPrograms[0].id, query });
      redirect(`${proposalProgramHref}${proposalProgramHref.includes("?") ? "&" : "?"}modal=project-proposal`);
    }
    if (divisionId === "UNASSIGNED" && !hasUnassigned) {
      redirect(activeProjectsHref({ programId, query, operation, page: requestedPage }));
    }
    const archivedPrograms = hideGraduationProgramsForStudent(archivedProgramsRaw, actor.role);
    const sidebarItems = actor.role === "ADMIN"
      ? buildAdminProgramSidebarItems(adminPrograms ?? [], "projects", managementTab, now)
      : buildProgramSidebarItems(sidebarPrograms, archivedPrograms, "active", { query }, now);
    const openProposalHref = `${closeProposalHref}${closeProposalHref.includes("?") ? "&" : "?"}modal=project-proposal`;
    const manageAction = actor.role === "ADMIN" && programId && selectedProgram
      ? <ProgramManageLink programId={programId} programName={selectedProgram.name} />
      : undefined;
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} />}>
        <ProjectPortalHero
          view="active"
          program={selectedProgram}
          search={<ProjectSearchForm view="active" programId={programId} query={query} divisionId={divisionId} operation={operation} />}
          titleAction={manageAction}
        />
        {actor.role === "ADMIN" && selectedProgram?.isStudentPublic === false && selectedProgram.isFacultyPublic === false ? (
          <aside role="status" className="mt-5 flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold text-[var(--muted)]">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 fill-none stroke-current stroke-[1.8]"><rect x="4.5" y="8.5" width="11" height="8" rx="2" /><path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" strokeLinecap="round" /></svg>
            <UiText>{"관리자에게만 보이는 비공개 프로그램 미리보기입니다."}</UiText>
          </aside>
        ) : null}
        <ProgramAnnouncementRail
          announcements={programAnnouncements}
          createHref={announcementCreateHref}
          manageableAnnouncementIds={programAnnouncements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id)}
          returnHref={closeProposalHref}
        />
        {actor.role === "ADMIN" && programId && operations ? (
          <AdminProjectOperationsSummary
            programId={programId}
            operations={operations}
            selectedFilter={operation ?? "all"}
            divisionId={divisionId}
            query={query}
          />
        ) : null}
        <ActiveProjectsView programId={programId} topics={topics} canApply={actor.role === "STUDENT" && !selectedProgram?.studentProjectCreationEnabled} leaderTeams={leaderTeams} query={query} divisionId={divisionId} divisions={selectedProgram?.divisions ?? []} hasUnassigned={hasUnassigned} now={now} ballot={ballot ?? undefined} votingResults={votingResults ?? undefined} adminProjectData={adminProjectData} operation={operation} registrationAction={<StudentProjectRegistrationLink role={actor.role} program={selectedProgram} now={now} href={openProposalHref} />} />
        {proposalRequested && proposalPrograms.length ? (
          <ProjectProposalModal
            programs={proposalPrograms.filter(({ id }) => id === programId)}
            defaultProgramId={programId}
            professors={proposalProfessors}
            studentTeams={leaderTeams}
            closeHref={closeProposalHref}
          />
        ) : null}
        {firstSearchParam(params.modal) === "announcement-new" && announcementCreateHref && programId && selectedProgram ? <ProgramAnnouncementCreateModal programId={programId} programName={selectedProgram.name} closeHref={closeProposalHref} createAction={createProgramAnnouncementAction} /> : null}
      </ExplorerLayout>
    );
  }

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">{content}</AppShell>;
}
