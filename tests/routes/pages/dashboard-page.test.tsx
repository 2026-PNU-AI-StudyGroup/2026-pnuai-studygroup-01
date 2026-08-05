import { render, screen } from "@testing-library/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/dashboard/page";

const {
  getCurrentActor,
  listAssistantInvitations,
  listPendingApprovals,
  listTeams,
  listTopics,
} = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listAssistantInvitations: vi.fn(),
  listPendingApprovals: vi.fn(),
  listTeams: vi.fn(),
  listTopics: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { topic: { findMany: listTopics } },
}));
vi.mock("@/modules/team/application/manage-team-workspace", () => ({
  TeamWorkspaceQueryService: class {
    listPage() { return listTeams(); }
  },
}));
vi.mock("@/modules/project-assistant/application/manage-project-assistants", () => ({
  ProjectAssistantQueryService: class {
    listPending() { return listAssistantInvitations(); }
  },
}));
vi.mock("@/modules/topic-approval/application/manage-topic-approvals", () => ({
  TopicApprovalService: class {
    listPendingForReview() { return listPendingApprovals(); }
  },
}));
vi.mock("@/modules/topic-application/application/list-own-topic-applications", () => ({
  ListOwnTopicApplicationsService: class {},
}));
vi.mock("@/modules/team/application/list-admin-project-overview", () => ({
  ListAdminProjectOverviewService: class {},
}));
vi.mock("@/modules/team/infrastructure/prisma-team-workspace-query-repository", () => ({ PrismaTeamWorkspaceQueryRepository: class {} }));
vi.mock("@/modules/team/infrastructure/prisma-admin-project-overview-reader", () => ({ PrismaAdminProjectOverviewReader: class {} }));
vi.mock("@/modules/project-assistant/infrastructure/prisma-project-assistant-repository", () => ({ PrismaProjectAssistantRepository: class {} }));
vi.mock("@/modules/topic-application/infrastructure/prisma-topic-application-query-repository", () => ({ PrismaTopicApplicationQueryRepository: class {} }));
vi.mock("@/modules/topic-approval/infrastructure/prisma-topic-approval-repository", () => ({ PrismaTopicApprovalRepository: class {} }));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/shared/ui/explorer-layout", () => ({ ExplorerLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/dashboard/_components/project-dashboard-hero", () => ({
  ProjectDashboardHero: () => <Link href="/professor/topics">주제 관리</Link>,
}));
vi.mock("@/app/dashboard/_components/project-dashboard-sidebar", () => ({ ProjectDashboardSidebar: () => null }));
vi.mock("@/app/dashboard/_components/project-application-list", () => ({ ProjectApplicationList: () => null }));
vi.mock("@/app/dashboard/_components/project-list", () => ({ ProjectList: () => null }));
vi.mock("@/app/dashboard/_components/admin-project-overview", () => ({ AdminProjectOverview: () => null }));
vi.mock("@/app/_components/project-approval-ledger", () => ({ ProjectApprovalLedger: () => null }));
vi.mock("@/app/_components/project-assistant-controls", () => ({ ProjectAssistantInvitationDecisionForm: () => null }));

describe("DashboardPage empty states", () => {
  beforeEach(() => {
    getCurrentActor.mockResolvedValue({
      id: "professor-1",
      name: "김교수",
      email: "professor@pusan.ac.kr",
      role: "PROFESSOR",
    });
    listTeams.mockResolvedValue({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      counts: { all: 0, active: 0, completed: 0 },
    });
    listAssistantInvitations.mockResolvedValue([]);
    listTopics.mockResolvedValue([]);
    listPendingApprovals.mockResolvedValue([]);
  });

  it("승인 0건을 명시하고 상단 행동과 중복되는 빈 상태 CTA는 만들지 않는다", async () => {
    render(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "승인 대기열" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "검토할 승인 요청이 없습니다" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "아직 연결된 프로젝트가 없습니다" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /주제 설계/ })).not.toHaveLength(0);
    for (const link of screen.getAllByRole("link", { name: /주제 설계/ })) {
      expect(link).toHaveAttribute("href", "/professor/topics");
    }
    expect(screen.queryByRole("link", { name: "새 주제 만들기" })).not.toBeInTheDocument();
  });
});
