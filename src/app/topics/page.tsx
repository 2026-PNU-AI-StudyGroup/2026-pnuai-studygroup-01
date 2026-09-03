import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ActiveProjectsView } from "@/app/topics/_components/active-projects-view";
import { AdminProjectOperationsSummary } from "@/app/topics/_components/admin-project-operations-summary";
import { PastProjectsView } from "@/app/topics/_components/past-projects-view";
import { ProjectExplorerView } from "@/app/topics/_components/project-explorer-view";
import { ProgramAnnouncementRail } from "@/app/topics/_components/program-announcement-rail";
import { ProgramApprovalLink } from "@/app/topics/_components/program-approval-link";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { ProjectRegistrationModal } from "@/app/topics/_components/project-registration-modal";
import { StudentProjectRegistrationLink } from "@/app/topics/_components/student-project-registration-link";
import { topicsHref, type ProjectView } from "@/app/topics/_lib/topics-query";
import { buildAdminProgramSidebarItems, buildProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { orderedProgramSidebarIds } from "@/modules/project-program/ui/program-sidebar-items";
import { hideGraduationProgramsForStudent } from "@/app/topics/_lib/hidden-graduation-programs";
import { keepInvitedProgramsForAdvisor } from "@/app/topics/_lib/advisor-invited-programs";
import { listInvitedProgramIds } from "@/modules/advisor/infrastructure/prisma-advisor-invitation-query";
import { findAdvisorProgramBanner } from "@/modules/advisor/infrastructure/prisma-advisor-workspace-banner-query";
import { AdvisorProgramBannerView } from "@/modules/advisor/ui/advisor-program-banner";
import { isProgramVotingOpen } from "@/modules/project-program/domain/project-program-policy";
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
import { announcementDeleteControls } from "@/app/_components/announcement-delete-controls";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { parseProgramManagementTab, programCreateHref, programManagementHref } from "@/modules/project-program/ui/program-management-route";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { ListAdminTopicPreviewService } from "@/modules/topic/application/list-admin-topic-preview";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { ListAdminProjectCardDataService } from "@/modules/team/application/list-admin-project-card-data";
import {
  ListAdminProgramProjectOperationsService,
  parseAdminProjectOperationFilters,
} from "@/modules/team/application/list-admin-program-project-operations";
import { PrismaAdminProjectCardDataReader } from "@/modules/team/infrastructure/prisma-admin-project-card-data-reader";
import { PrismaAdminProgramProjectOperationsReader } from "@/modules/team/infrastructure/prisma-admin-program-project-operations-reader";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { EmptyState } from "@/shared/ui/page-primitives";
import { SettingsIcon } from "@/shared/ui/workspace-icons";

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
  teamStatus?: SearchParamValue;
  reportStatus?: SearchParamValue;
  operation?: SearchParamValue;
};

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

function ProgramAdminTitleActions({ programId, programName, pendingApprovalCount }: {
  programId: string;
  programName: string;
  pendingApprovalCount: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <ProgramManageLink programId={programId} programName={programName} />
      {pendingApprovalCount > 0 ? <ProgramApprovalLink programId={programId} count={pendingApprovalCount} /> : null}
    </div>
  );
}

export default async function TopicsPage({ searchParams }: { searchParams: Promise<TopicsSearchParams> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const params = await searchParams;
  if (actor.role === "STUDENT" && firstSearchParam(params.modal) === "project-proposal") {
    const canonicalParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const item = firstSearchParam(value);
      if (item) canonicalParams.set(key, key === "modal" ? "project-registration" : item);
    }
    redirect(`/topics?${canonicalParams.toString()}`);
  }
  const view: ProjectView = firstSearchParam(params.view) === "past" ? "past" : "active";
  const requestedMode = firstSearchParam(params.mode);
  const now = new Date();
  // 대분류를 세우는 차례는 운영자가 정한다. 사이드바와 기본 선택이 같은 값을 봐야 한다.
  const categoryOrder = await listProgramCategoryOrder(prisma);
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const requestedTeamStatus = firstSearchParam(params.teamStatus);
  const legacyOperation = firstSearchParam(params.operation);
  const operationFilters = actor.role === "ADMIN"
    ? parseAdminProjectOperationFilters({
      teamStatus: requestedTeamStatus,
      reportStatus: firstSearchParam(params.reportStatus),
      operation: legacyOperation,
    })
    : undefined;
  const registrationRequested = actor.role === "STUDENT" && firstSearchParam(params.modal) === "project-registration";
  const topicAudience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const topicRepository = new PrismaTopicQueryRepository(prisma, topicAudience);
  const topicService = new ListPublishedTopicsService(topicRepository);
  const programRepository = new PrismaProjectProgramRepository(prisma);
  const programService = new ProjectProgramService(programRepository);
  const approvalService = new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), programRepository);
  const archiveAudience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const archiveService = new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma, archiveAudience));
  const votingService = new ProjectVotingService(new PrismaProjectVotingRepository(prisma));
  const loadVotingResults = async (programId?: string) => {
    if (!programId) return null;
    if (actor.role === "ADMIN") {
      const results = await votingService.getResults(actor, programId);
      return results ? { mode: "ADMIN" as const, results } : null;
    }
    const results = await votingService.getPublicResults(actor, programId);
    return results ? { mode: "PUBLIC" as const, results } : null;
  };
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

  const [adminPrograms, adminPendingApprovalCounts] = actor.role === "ADMIN"
    ? await Promise.all([
        programService.listAll(actor),
        approvalService.listAdminPendingCountsByProgram(actor),
      ])
    : [undefined, []];
  const pendingApprovalCounts = new Map(adminPendingApprovalCounts.map(({ programId, count }) => [programId, count]));
  // 자문위원은 불려 온 프로그램만 본다. 프로그램 목록을 여기서 한 번 좁혀 두면 사이드바·기본
  // 선택·주제 목록이 전부 같은 범위를 보게 된다.
  const invitedProgramIds = new Set(
    actor.role === "ADVISOR" ? await listInvitedProgramIds(prisma, actor.id) : [],
  );
  const forAdvisor = <T extends { id: string }>(programs: T[]) =>
    keepInvitedProgramsForAdvisor(programs, actor.role, invitedProgramIds);
  const advisorBanner = async (programId: string | undefined) => {
    if (actor.role !== "ADVISOR" || !programId) return undefined;
    const banner = await findAdvisorProgramBanner(prisma, { userId: actor.id, programId }, now);
    return banner ? <AdvisorProgramBannerView banner={banner} now={now} /> : undefined;
  };
  // 초대가 하나도 없으면 프로그램을 고르지 못해 필터가 풀린 목록(=전체 프로젝트)이 나간다.
  // 여기서 끊어 회수된 위원이 남의 프로그램을 훑지 못하게 한다.
  if (actor.role === "ADVISOR" && invitedProgramIds.size === 0) {
    return (
      <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">
        <main className="content-shell page-enter">
          <EmptyState
            title="심사할 프로그램이 없습니다"
            description="초대가 회수되었거나 아직 배정되지 않았습니다. 초대 링크를 보낸 담당자에게 문의해 주세요."
          />
        </main>
      </AppShell>
    );
  }

  if (actor.role === "ADMIN" && requestedMode === "create") {
    redirect(programCreateHref());
  }
  if (actor.role === "ADMIN" && requestedMode === "manage") {
    const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const defaultProgram = adminPrograms?.find(({ endsAt }) => endsAt > now) ?? adminPrograms?.[0];
    const programId = adminPrograms?.some(({ id }) => id === requestedProgramId) ? requestedProgramId : defaultProgram?.id;
    if (firstSearchParam(params.tab) === "overview") {
      redirect(programId ? topicsHref({ programId }) : "/topics");
    }
    redirect(programId
      ? programManagementHref(programId, parseProgramManagementTab(firstSearchParam(params.tab)))
      : programCreateHref());
  }

  if (view === "past") {
    const requestedArchiveProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    const requestedDivisionId = firstSearchParam(params.divisionId)?.trim().slice(0, 200) || undefined;
    const [initialArchive, sidebarProgramsRaw] = await Promise.all([
      archiveService.execute(requestedPage, 18, { query, programId: requestedArchiveProgramId }),
      actor.role === "ADMIN" ? Promise.resolve([]) : programService.listSidebarVisible(now),
    ]);
    // 졸업과제는 다른 사이트로 이관 — 학생 탐색에서 졸업과제/캡스톤 프로그램 숨김.
    initialArchive.programs = forAdvisor(hideGraduationProgramsForStudent(initialArchive.programs, actor.role));
    const sidebarPrograms = forAdvisor(hideGraduationProgramsForStudent(sidebarProgramsRaw, actor.role));
    // 종료된 프로그램은 사이드바(공개 프로그램)엔 있지만 아카이브 목록(닫힌 팀 보유 프로그램)엔
    // 없을 수 있다. 선택 후보를 둘의 합집합으로 넓혀야 클릭 시 다른 프로그램으로 튕기지 않는다.
    const adminClosedPrograms = adminPrograms?.filter((program) => program.endsAt <= now) ?? [];
    const programId = resolveProgramSelection(requestedArchiveProgramId, actor.role === "ADMIN" ? adminClosedPrograms : [...initialArchive.programs, ...sidebarPrograms]);
    if (programId && programId !== requestedArchiveProgramId) {
      redirect(topicsHref({ view: "past", programId, q: query, page: requestedPage }));
    }
    const selectedProgram = adminPrograms?.find((program) => program.id === programId)
      ?? initialArchive.programs.find((program) => program.id === programId)
      ?? sidebarPrograms.find((program) => program.id === programId);
    const divisionId = selectedProgram?.divisions?.some((division) => division.id === requestedDivisionId)
      ? requestedDivisionId
      : undefined;
    if (requestedDivisionId && divisionId !== requestedDivisionId) {
      redirect(topicsHref({ view: "past", programId, q: query, page: requestedPage }));
    }
    const archive = divisionId
      ? await archiveService.execute(requestedPage, 18, { query, programId, divisionId })
      : initialArchive;
    const closeAnnouncementHref = topicsHref({ view: "past", programId, divisionId, q: query, page: requestedPage });
    const [ballot, votingResults, programAnnouncements, announcementCreateHref] = await Promise.all([
      programId ? votingService.getBallot(actor, programId) : Promise.resolve(undefined),
      loadVotingResults(programId),
      listProgramAnnouncements(programId),
      programAnnouncementCreateHref(programId, closeAnnouncementHref),
    ]);
    const adminProjectData = actor.role === "ADMIN"
      ? await adminProjectCardDataService.execute(actor, archive.projects.map(({ topicId }) => topicId))
      : undefined;
    const sidebarItems = actor.role === "ADMIN"
      ? buildAdminProgramSidebarItems(adminPrograms ?? [], now, pendingApprovalCounts)
      : buildProgramSidebarItems(sidebarPrograms, initialArchive.programs, "past", { query }, now);
    const manageAction = actor.role === "ADMIN" && programId && selectedProgram
      ? <ProgramAdminTitleActions programId={programId} programName={selectedProgram.name} pendingApprovalCount={pendingApprovalCounts.get(programId) ?? 0} />
      : undefined;
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} categoryOrder={categoryOrder} />}>
        <ProjectExplorerView
          view="past"
          program={selectedProgram}
          search={<ProjectSearchForm view="past" programId={programId} query={query} divisionId={divisionId} />}
          titleAction={manageAction}
          banner={await advisorBanner(programId)}
          announcementRail={(
            <ProgramAnnouncementRail
              announcements={programAnnouncements}
              createHref={announcementCreateHref}
              manageableAnnouncementIds={programAnnouncements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id)}
              deleteControls={announcementDeleteControls(programAnnouncements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id))}
              returnHref={closeAnnouncementHref}
            />
          )}
          overlays={firstSearchParam(params.modal) === "announcement-new" && announcementCreateHref && programId && selectedProgram ? <ProgramAnnouncementCreateModal programId={programId} programName={selectedProgram.name} closeHref={closeAnnouncementHref} createAction={createProgramAnnouncementAction} /> : null}
        >
          <PastProjectsView {...archive} query={query} programId={programId} divisionId={divisionId} divisions={selectedProgram?.divisions ?? []} ballot={ballot ?? undefined} votingResults={votingResults ?? undefined} adminProjectData={adminProjectData} />
        </ProjectExplorerView>
      </ExplorerLayout>
    );
  } else {
    const [programsRaw, sidebarProgramsRaw] = await Promise.all([
      actor.role === "ADMIN" ? Promise.resolve(adminPrograms ?? []) : programService.listPublic(),
      actor.role === "ADMIN" ? Promise.resolve([]) : programService.listSidebarVisible(now),
    ]);
    // 졸업과제는 다른 사이트로 이관 — 학생 탐색에서 졸업과제/캡스톤 프로그램 숨김.
    const programs = actor.role === "ADMIN"
      ? (adminPrograms ?? []).filter((program) => program.endsAt > now)
      : forAdvisor(hideGraduationProgramsForStudent(programsRaw, actor.role));
    const sidebarPrograms = forAdvisor(hideGraduationProgramsForStudent(sidebarProgramsRaw, actor.role));
    const requestedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200) || undefined;
    // 사이드바 목록 맨 위 프로그램과 기본으로 열리는 프로그램을 같게 맞춘다.
    // 예전에는 관리자만 맞춰 두어 학생과 교수는 맨 위와 다른 프로그램이 열렸다.
    // 지난 프로그램은 목록에서 진행 중인 것들 뒤에 붙으므로 맨 위를 정하는 데 영향이 없다.
    const sidebarOrder = actor.role === "ADMIN"
      ? orderedProgramSidebarIds(buildAdminProgramSidebarItems(adminPrograms ?? [], now, pendingApprovalCounts), categoryOrder)
      : orderedProgramSidebarIds(buildProgramSidebarItems(sidebarPrograms, [], "active", { query }, now), categoryOrder);
    const programId = resolveProgramSelection(requestedProgramId, programs, sidebarOrder);
    const requestedDivisionId = firstSearchParam(params.divisionId)?.trim().slice(0, 200) || undefined;
    if (programId && programId !== requestedProgramId) {
      redirect(topicsHref({ programId, q: query, teamStatus: operationFilters?.team, reportStatus: operationFilters?.report, page: requestedPage }));
    }
    const selectedProgram = programs.find((program) => program.id === programId);
    // 투표 기간에는 사람마다 다른 순서로 보여 상단 노출 이득을 흩는다.
    // 같은 사람에게는 같은 순서라 스크롤과 페이지 넘김이 어긋나지 않는다.
    const showcaseShuffleSeed = programId && isProgramVotingOpen(selectedProgram?.votingPolicy ?? null, now)
      ? `${programId}:${actor.id}`
      : undefined;
    const divisionId = selectedProgram?.divisions?.some((division) => division.id === requestedDivisionId)
      ? requestedDivisionId
      : requestedDivisionId === "UNASSIGNED" && programId ? "UNASSIGNED" : undefined;
    if (requestedDivisionId && divisionId !== requestedDivisionId) redirect(topicsHref({ programId, q: query, teamStatus: operationFilters?.team, reportStatus: operationFilters?.report, page: requestedPage }));
    const projectFilters = {
      team: selectedProgram?.studentProjectCreationEnabled ? "all" as const : operationFilters?.team ?? "all",
      report: operationFilters?.report ?? "all",
    };
    const hasTeamFilterToNormalize = requestedTeamStatus !== undefined
      || legacyOperation === "operating"
      || legacyOperation === "unassigned";
    if (selectedProgram?.studentProjectCreationEnabled && hasTeamFilterToNormalize) {
      redirect(topicsHref({ programId, divisionId, q: query, reportStatus: projectFilters.report, page: requestedPage }));
    }
    const closeRegistrationHref = topicsHref({ programId, divisionId, q: query, teamStatus: projectFilters.team, reportStatus: projectFilters.report, page: requestedPage });
    const operations = actor.role === "ADMIN" && programId
      ? await adminProgramProjectOperationsService.execute(actor, programId, projectFilters, divisionId)
      : undefined;
    const [topics, archivedProgramsRaw, leaderTeams, ballot, votingResults, programAnnouncements, announcementCreateHref, registrationPrograms, registrationProfessors] = await Promise.all([
      actor.role === "ADMIN"
        ? new ListAdminTopicPreviewService(topicRepository).execute(actor, { programId, divisionId, query, page: requestedPage, now, topicIds: operations?.matchingTopicIds })
        : topicService.execute({ viewerId: actor.role === "STUDENT" ? actor.id : undefined, programId, divisionId, query, page: requestedPage, now, shuffleSeed: showcaseShuffleSeed }),
      archiveService.listPrograms(),
      actor.role === "STUDENT"
        ? new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id)
        : Promise.resolve([]),
      programId ? votingService.getBallot(actor, programId) : Promise.resolve(undefined),
      loadVotingResults(programId),
      listProgramAnnouncements(programId),
      programAnnouncementCreateHref(programId, closeRegistrationHref),
      registrationRequested ? programService.listStudentCreatableOpen() : Promise.resolve([]),
      registrationRequested
        ? approvalService.listProfessors()
        : Promise.resolve([]),
    ]);
    const adminProjectData = actor.role === "ADMIN"
      ? await adminProjectCardDataService.execute(actor, topics.items.map(({ id }) => id))
      : undefined;
    const hasUnassigned = programId && selectedProgram?.divisions?.length
      ? Boolean(await prisma.topic.findFirst({ where: { programId, divisionId: null, status: "ACTIVE" }, select: { id: true } }))
      : false;
    if (registrationRequested && registrationPrograms.length && !registrationPrograms.some(({ id }) => id === programId)) {
      const registrationProgramHref = topicsHref({ programId: registrationPrograms[0].id, q: query });
      redirect(`${registrationProgramHref}${registrationProgramHref.includes("?") ? "&" : "?"}modal=project-registration`);
    }
    if (divisionId === "UNASSIGNED" && !hasUnassigned) {
      redirect(topicsHref({ programId, q: query, teamStatus: projectFilters.team, reportStatus: projectFilters.report, page: requestedPage }));
    }
    const archivedPrograms = forAdvisor(hideGraduationProgramsForStudent(archivedProgramsRaw, actor.role));
    const sidebarItems = actor.role === "ADMIN"
      ? buildAdminProgramSidebarItems(adminPrograms ?? [], now, pendingApprovalCounts)
      : buildProgramSidebarItems(sidebarPrograms, archivedPrograms, "active", { query }, now);
    const openRegistrationHref = `${closeRegistrationHref}${closeRegistrationHref.includes("?") ? "&" : "?"}modal=project-registration`;
    const manageAction = actor.role === "ADMIN" && programId && selectedProgram
      ? <ProgramAdminTitleActions programId={programId} programName={selectedProgram.name} pendingApprovalCount={pendingApprovalCounts.get(programId) ?? 0} />
      : undefined;
    content = (
      <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={programId} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} categoryOrder={categoryOrder} />}>
        <ProjectExplorerView
          view="active"
          program={selectedProgram}
          search={<ProjectSearchForm view="active" programId={programId} query={query} divisionId={divisionId} teamStatus={projectFilters.team} reportStatus={projectFilters.report} />}
          titleAction={manageAction}
          banner={await advisorBanner(programId)}
          privatePreview={actor.role === "ADMIN" && selectedProgram?.isPublic === false}
          announcementRail={(
            <ProgramAnnouncementRail
              announcements={programAnnouncements}
              createHref={announcementCreateHref}
              manageableAnnouncementIds={programAnnouncements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id)}
              deleteControls={announcementDeleteControls(programAnnouncements.filter((announcement) => announcementService.canManage(actor, announcement)).map((announcement) => announcement.id))}
              returnHref={closeRegistrationHref}
            />
          )}
          overlays={(
            <>
              {registrationRequested && registrationPrograms.length ? (
                <ProjectRegistrationModal
                  programs={registrationPrograms.filter(({ id }) => id === programId)}
                  defaultProgramId={programId}
                  professors={registrationProfessors}
                  studentTeams={leaderTeams}
                  closeHref={closeRegistrationHref}
                />
              ) : null}
              {firstSearchParam(params.modal) === "announcement-new" && announcementCreateHref && programId && selectedProgram ? <ProgramAnnouncementCreateModal programId={programId} programName={selectedProgram.name} closeHref={closeRegistrationHref} createAction={createProgramAnnouncementAction} /> : null}
            </>
          )}
        >
        {actor.role === "ADMIN" && programId && operations ? (
          <AdminProjectOperationsSummary
            programId={programId}
            operations={operations}
            selectedTeamFilter={projectFilters.team}
            selectedReportFilter={projectFilters.report}
            showTeamFilter={!selectedProgram?.studentProjectCreationEnabled}
            divisionId={divisionId}
            query={query}
          />
        ) : null}
        <ActiveProjectsView programId={programId} topics={topics} canApply={actor.role === "STUDENT" && !selectedProgram?.studentProjectCreationEnabled} leaderTeams={leaderTeams} query={query} divisionId={divisionId} divisions={selectedProgram?.divisions ?? []} hasUnassigned={hasUnassigned} now={now} ballot={ballot ?? undefined} votingResults={votingResults ?? undefined} adminProjectData={adminProjectData} teamStatus={projectFilters.team} reportStatus={projectFilters.report} registrationAction={<StudentProjectRegistrationLink role={actor.role} program={selectedProgram} now={now} href={openRegistrationHref} />} />
        </ProjectExplorerView>
      </ExplorerLayout>
    );
  }

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">{content}</AppShell>;
}
