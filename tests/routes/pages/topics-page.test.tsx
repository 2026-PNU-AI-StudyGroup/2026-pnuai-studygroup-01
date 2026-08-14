import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TopicsPage from "@/app/topics/page";

const {
  getCurrentActor,
  listArchived,
  listArchivedPrograms,
  listPrograms,
  listPublished,
  listSidebarPrograms,
  getVotingBallot,
  getVotingResults,
  getPublicVotingResults,
  activeProjectsView,
  appShell,
  listAdminOverview,
  listAdminPendingApprovalCounts,
  programManagementWorkspace,
  parseProgramManagementTab,
} = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listArchived: vi.fn(),
  listArchivedPrograms: vi.fn(),
  listPrograms: vi.fn(),
  listPublished: vi.fn(),
  listSidebarPrograms: vi.fn(),
  getVotingBallot: vi.fn(),
  getVotingResults: vi.fn(),
  getPublicVotingResults: vi.fn(),
  activeProjectsView: vi.fn(),
  appShell: vi.fn(),
  listAdminOverview: vi.fn(),
  listAdminPendingApprovalCounts: vi.fn(),
  programManagementWorkspace: vi.fn(),
  parseProgramManagementTab: vi.fn((value: string | undefined) => value === "settings" ? "settings" : "overview"),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/project-program/application/manage-project-programs", () => ({
  ProjectProgramService: class {
    listAll = listPrograms;
    listPublic = listPrograms;
    listSidebarVisible = listSidebarPrograms;
    listStudentCreatableOpen = vi.fn().mockResolvedValue([]);
  },
  programLifecycleStatus: vi.fn().mockReturnValue("ACTIVE"),
}));
vi.mock("@/modules/topic/application/list-published-topics", () => ({
  ListPublishedTopicsService: class { execute = listPublished; },
}));
vi.mock("@/modules/topic/application/list-admin-topic-preview", () => ({ ListAdminTopicPreviewService: class {} }));
vi.mock("@/modules/team/application/archive-projects", () => ({
  ListArchivedProjectsService: class {
    execute = listArchived;
    listPrograms = listArchivedPrograms;
  },
}));
vi.mock("@/modules/project-voting/application/manage-project-voting", () => ({
  ProjectVotingService: class {
    getBallot = getVotingBallot;
    getResults = getVotingResults;
    getPublicResults = getPublicVotingResults;
  },
}));
vi.mock("@/modules/announcement/application/manage-announcements", () => ({
  AnnouncementService: class {
    listForProgram = vi.fn().mockResolvedValue([]);
    canManage = vi.fn().mockReturnValue(false);
  },
  canWriteAnnouncementTarget: vi.fn().mockReturnValue(false),
}));
vi.mock("@/modules/announcement/domain/announcement-policy", () => ({ canCreateAnnouncement: vi.fn().mockReturnValue(false) }));
vi.mock("@/modules/announcement/infrastructure/announcement-audience", () => ({ resolveAnnouncementAudience: vi.fn().mockResolvedValue({}) }));
vi.mock("@/modules/team/application/list-admin-project-card-data", () => ({ ListAdminProjectCardDataService: class {} }));
vi.mock("@/modules/team/application/list-admin-program-project-operations", () => ({
  ListAdminProgramProjectOperationsService: class {},
  parseAdminProjectOperationFilter: vi.fn().mockReturnValue("all"),
}));
vi.mock("@/modules/team/application/list-admin-project-overview", () => ({
  ListAdminProjectOverviewService: class { execute = listAdminOverview; },
}));
vi.mock("@/modules/team/ui/admin-project-overview-query", () => ({
  parseAdminProjectPage: vi.fn().mockReturnValue(1),
  parseAdminProjectProgressFilter: vi.fn().mockReturnValue("all"),
}));
vi.mock("@/modules/project-program/ui/program-management-query", () => ({
  parseProgramManagementTab,
  programManagementHref: vi.fn((programId: string) => `/topics?programId=${programId}&mode=manage`),
}));
vi.mock("@/modules/topic-approval/application/manage-topic-approvals", () => ({
  TopicApprovalService: class {
    listAdminPendingCountsByProgram = listAdminPendingApprovalCounts;
    listProfessors = vi.fn().mockResolvedValue([]);
  },
}));

vi.mock("@/modules/announcement/infrastructure/prisma-announcement-repository", () => ({ PrismaAnnouncementRepository: class {} }));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository", () => ({
  PrismaStudentTeamRecruitmentQueryRepository: class { listLeaderTeams = vi.fn().mockResolvedValue([]); },
}));
vi.mock("@/modules/topic/infrastructure/prisma-topic-query-repository", () => ({ PrismaTopicQueryRepository: class {} }));
vi.mock("@/modules/topic-approval/infrastructure/prisma-topic-approval-repository", () => ({ PrismaTopicApprovalRepository: class {} }));
vi.mock("@/modules/team/infrastructure/prisma-admin-project-card-data-reader", () => ({ PrismaAdminProjectCardDataReader: class {} }));
vi.mock("@/modules/team/infrastructure/prisma-admin-program-project-operations-reader", () => ({ PrismaAdminProgramProjectOperationsReader: class {} }));
vi.mock("@/modules/team/infrastructure/prisma-admin-project-overview-reader", () => ({ PrismaAdminProjectOverviewReader: class {} }));
vi.mock("@/modules/team/infrastructure/prisma-team-archive-query-repository", () => ({ PrismaTeamArchiveQueryRepository: class {} }));
vi.mock("@/modules/project-voting/infrastructure/prisma-project-voting-repository", () => ({ PrismaProjectVotingRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: { topic: { findFirst: vi.fn() } } }));

vi.mock("@/app/_components/app-shell", () => ({
  AppShell: ({ children, ...props }: { children: ReactNode }) => {
    appShell(props);
    return <>{children}</>;
  },
}));
vi.mock("@/shared/ui/explorer-layout", () => ({ ExplorerLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/app/topics/_components/project-explorer-view", () => ({
  ProjectExplorerView: ({ view, announcementRail, children }: { view: string; announcementRail: ReactNode; children: ReactNode }) => <><header><h1>{view} 프로젝트 Hero</h1></header>{announcementRail}{children}</>,
}));
vi.mock("@/app/topics/_components/program-announcement-rail", () => ({ ProgramAnnouncementRail: () => <p>프로그램 공지</p> }));
vi.mock("@/app/topics/_components/active-projects-view", () => ({
  ActiveProjectsView: (props: unknown) => {
    activeProjectsView(props);
    return <p>진행 중 프로젝트 목록</p>;
  },
}));
vi.mock("@/app/topics/_components/past-projects-view", () => ({ PastProjectsView: () => <p>지난 프로젝트 목록</p> }));
vi.mock("@/app/topics/_components/program-sidebar", () => ({ ProgramSidebar: () => null }));
vi.mock("@/app/topics/_components/project-search-form", () => ({ ProjectSearchForm: () => null }));
vi.mock("@/app/topics/_components/admin-project-operations-summary", () => ({ AdminProjectOperationsSummary: () => null }));
vi.mock("@/app/topics/_components/project-proposal-modal", () => ({ ProjectProposalModal: () => null }));
vi.mock("@/app/topics/_components/student-project-registration-link", () => ({ StudentProjectRegistrationLink: () => null }));
vi.mock("@/app/topics/_management/program-management-workspace", () => ({
  ProgramCreateWorkspace: () => null,
  ProgramManagementWorkspace: (props: unknown) => {
    programManagementWorkspace(props);
    return null;
  },
}));
vi.mock("@/modules/announcement/ui/program-announcement-create-modal", () => ({ ProgramAnnouncementCreateModal: () => null }));
vi.mock("@/app/topics/_actions/create-program-announcement-action", () => ({ createProgramAnnouncementAction: vi.fn() }));

const emptyPage = { items: [], total: 0, page: 1, totalPages: 1 };
const emptyArchive = { projects: [], programs: [], total: 0, page: 1, totalPages: 1 };

describe("TopicsPage", () => {
  beforeEach(() => {
    getCurrentActor.mockResolvedValue({ id: "student-1", name: "학생", role: "STUDENT" });
    listPrograms.mockResolvedValue([]);
    listSidebarPrograms.mockResolvedValue([]);
    listPublished.mockResolvedValue(emptyPage);
    listArchived.mockResolvedValue(emptyArchive);
    listArchivedPrograms.mockResolvedValue([]);
    getVotingBallot.mockResolvedValue(undefined);
    getVotingResults.mockResolvedValue(null);
    getPublicVotingResults.mockResolvedValue(null);
    listAdminOverview.mockResolvedValue([]);
    listAdminPendingApprovalCounts.mockResolvedValue([]);
    programManagementWorkspace.mockReset();
    appShell.mockReset();
  });

  it.each([
    { searchParams: {}, view: "active", list: "진행 중 프로젝트 목록" },
    { searchParams: { view: "past" }, view: "past", list: "지난 프로젝트 목록" },
  ])("$view 보기를 Hero → 공지 → 목록 순서로 조립한다", async ({ searchParams, view, list }) => {
    render(await TopicsPage({ searchParams: Promise.resolve(searchParams) }));

    const hero = screen.getByRole("heading", { name: `${view} 프로젝트 Hero` });
    const announcement = screen.getByText("프로그램 공지");
    const projectList = screen.getByText(list);

    expect(hero.compareDocumentPosition(announcement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(announcement.compareDocumentPosition(projectList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("학생에게 허용된 공개 결과를 PUBLIC 모드로 프로젝트 목록에 전달한다", async () => {
    const program = {
      id: "program-1",
      name: "캡스톤",
      endsAt: new Date("2026-12-31T00:00:00Z"),
      divisions: [],
      studentProjectCreationEnabled: false,
    };
    const publicResults = {
      programId: "program-1",
      programName: "캡스톤",
      phase: "OPEN",
      voteLimitScope: "PROGRAM",
      totalVotes: 0,
      results: [],
    };
    listPrograms.mockResolvedValue([program]);
    listSidebarPrograms.mockResolvedValue([program]);
    getPublicVotingResults.mockResolvedValue(publicResults);

    render(await TopicsPage({ searchParams: Promise.resolve({ programId: "program-1" }) }));

    expect(getPublicVotingResults).toHaveBeenCalledWith(expect.objectContaining({ role: "STUDENT" }), "program-1");
    expect(getVotingResults).not.toHaveBeenCalled();
    expect(activeProjectsView).toHaveBeenCalledWith(expect.objectContaining({
      votingResults: { mode: "PUBLIC", results: publicResults },
    }));
  });

  it.each([
    { tab: "overview", currentPath: "/dashboard" },
    { tab: "settings", currentPath: "/admin/professors" },
  ])("관리 탭 $tab을 전역 메뉴 문맥 $currentPath로 전달한다", async ({ tab, currentPath }) => {
    const program = {
      id: "program-1",
      name: "캡스톤",
      endsAt: new Date("2026-12-31T00:00:00Z"),
      divisions: [],
      studentProjectCreationEnabled: false,
    };
    getCurrentActor.mockResolvedValue({ id: "admin-1", name: "관리자", role: "ADMIN" });
    listPrograms.mockResolvedValue([program]);

    render(await TopicsPage({ searchParams: Promise.resolve({ mode: "manage", tab, programId: program.id }) }));

    expect(appShell).toHaveBeenCalledWith(expect.objectContaining({ currentPath }));
  });

  it("프로그램별 승인 대기 집계를 선택 프로그램 관리 화면에 전달한다", async () => {
    const program = {
      id: "program-1",
      name: "캡스톤",
      category: "캡스톤 디자인",
      icon: "FOLDER",
      startYear: 2026,
      topicCount: 1,
      isPublic: false,
      endsAt: new Date("2026-12-31T00:00:00Z"),
      divisions: [],
      studentProjectCreationEnabled: false,
    };
    getCurrentActor.mockResolvedValue({ id: "admin-1", name: "관리자", role: "ADMIN" });
    listPrograms.mockResolvedValue([program]);
    listAdminPendingApprovalCounts.mockResolvedValue([{ programId: "program-1", count: 2 }]);

    render(await TopicsPage({ searchParams: Promise.resolve({ mode: "manage", programId: "program-1" }) }));

    expect(listAdminPendingApprovalCounts).toHaveBeenCalledWith(expect.objectContaining({ role: "ADMIN" }));
    expect(programManagementWorkspace).toHaveBeenCalledWith(expect.objectContaining({ pendingApprovalCount: 2 }));
  });
});
