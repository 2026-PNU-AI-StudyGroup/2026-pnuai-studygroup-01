import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ProjectDashboardHero } from "@/app/dashboard/_components/project-dashboard-hero";
import { ProjectDashboardSidebar } from "@/app/dashboard/_components/project-dashboard-sidebar";
import { ProjectApplicationList } from "@/app/dashboard/_components/project-application-list";
import { ProjectList } from "@/app/dashboard/_components/project-list";
import { AdminProjectOverview } from "@/app/dashboard/_components/admin-project-overview";
import { ProjectApprovalLedger } from "@/app/_components/project-approval-ledger";
import {
  buildProjectDashboardCounts,
  parseProjectDashboardView,
  type ProjectDashboardCounts,
  type ProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamWorkspaceQueryService } from "@/modules/team/application/manage-team-workspace";
import { ListAdminProjectOverviewService } from "@/modules/team/application/list-admin-project-overview";
import { PrismaAdminProjectOverviewReader } from "@/modules/team/infrastructure/prisma-admin-project-overview-reader";
import { PrismaTeamWorkspaceQueryRepository } from "@/modules/team/infrastructure/prisma-team-workspace-query-repository";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { ProjectAssistantInvitationDecisionForm } from "@/app/_components/project-assistant-controls";
import { ProjectAssistantQueryService } from "@/modules/project-assistant/application/manage-project-assistants";
import { PrismaProjectAssistantRepository } from "@/modules/project-assistant/infrastructure/prisma-project-assistant-repository";
import { ProjectPagination } from "@/shared/ui/project-pagination";
import { ProfessorWorkspace } from "@/shared/ui/professor-workspace";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트");
}

function ProjectDashboardFrame({ role, counts, view, children }: {
  role: "STUDENT" | "PROFESSOR";
  counts: ProjectDashboardCounts;
  view: ProjectDashboardView;
  children: ReactNode;
}) {
  const explorer = (
    <ExplorerLayout sidebar={<ProjectDashboardSidebar counts={counts} selectedView={view} student={role === "STUDENT"} />}>
      {role === "STUDENT" ? <ProjectDashboardHero role={role} /> : null}
      {children}
    </ExplorerLayout>
  );
  return role === "PROFESSOR" ? (
    <ProfessorWorkspace currentPath="/dashboard" title="프로젝트 운영" description="확정된 팀의 마일스톤과 작업 현황, 승인 대기 항목을 관리합니다.">
      {explorer}
    </ProfessorWorkspace>
  ) : explorer;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: SearchParamValue;
    page?: SearchParamValue;
    programId?: SearchParamValue;
  }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const student = actor.role === "STUDENT";
  const requestedView = parseProjectDashboardView(firstSearchParam(params.view));
  const view = !student && (requestedView === "pending" || requestedView === "rejected")
    ? "all"
    : requestedView;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  if (actor.role === "ADMIN") {
    const programs = await new ListAdminProjectOverviewService(
      new PrismaAdminProjectOverviewReader(prisma),
    ).execute(actor);
    const selectedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200);

    return (
      <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
        <AdminProjectOverview
          programs={programs}
          selectedProgramId={selectedProgramId}
        />
      </AppShell>
    );
  }

  const teamStatus = view === "active" ? "ACTIVE" : view === "completed" ? "COMPLETED" : undefined;
  const teamPagePromise = new TeamWorkspaceQueryService(
    new PrismaTeamWorkspaceQueryRepository(prisma),
  ).listPage(actor, view === "all" || teamStatus ? requestedPage : 1, teamStatus);
  const assistantInvitationsPromise = new ProjectAssistantQueryService(
    new PrismaProjectAssistantRepository(prisma),
  ).listPending(actor);
  const assistantTopicsPromise = prisma.topic.findMany({
    where: { assistants: { some: { userId: actor.id } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      status: true,
      program: { select: { name: true } },
      team: { select: { id: true } },
    },
  });
  const pendingApprovalPromise = actor.role === "PROFESSOR"
    ? new TopicApprovalService(
        new PrismaTopicApprovalRepository(prisma),
        new PrismaProjectProgramRepository(prisma),
      ).listPendingForReview(actor)
    : Promise.resolve([]);
  const applicationService = student
    ? new ListOwnTopicApplicationsService(
        new PrismaTopicApplicationQueryRepository(prisma),
      )
    : null;
  const primaryApplicationPromise = applicationService
    ? applicationService.execute(
        actor,
        view === "pending" || view === "rejected" ? requestedPage : 1,
        20,
        view === "rejected" ? "REJECTED" : "PENDING",
      )
    : null;
  const secondaryApplicationPromise = applicationService && view === "all"
    ? applicationService.execute(actor, 1, 20, "REJECTED")
    : null;
  const [teamPage, assistantInvitations, assistantTopics, pendingApprovals, primaryApplicationPage, secondaryApplicationPage] = await Promise.all([
    teamPagePromise,
    assistantInvitationsPromise,
    assistantTopicsPromise,
    pendingApprovalPromise,
    primaryApplicationPromise,
    secondaryApplicationPromise,
  ]);
  const teams = teamPage.items;
  const activeCount = teamPage.counts.active;
  const completedCount = teamPage.counts.completed;
  const applicationCounts = primaryApplicationPage?.counts ?? {
    PENDING: 0,
    ACCEPTED: 0,
    REJECTED: 0,
  };
  const counts = buildProjectDashboardCounts({
    pending: applicationCounts.PENDING,
    rejected: applicationCounts.REJECTED,
    active: activeCount,
    completed: completedCount,
  });
  const visibleTeams = view === "active"
    ? teams.filter((team) => team.status !== "CLOSED")
    : view === "completed"
      ? teams.filter((team) => team.status === "CLOSED")
      : teams;
  const hasAnyProject = counts.all > 0;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <ProjectDashboardFrame role={actor.role} counts={counts} view={view}>
        <div className="page-enter space-y-8 pt-5">
          {assistantInvitations.length > 0 ? (
            <section aria-labelledby="assistant-invitations-title" className="border-y border-[var(--line)] bg-[var(--primary-subtle)] px-5 py-5">
              <h2 id="assistant-invitations-title" className="text-lg font-bold"><UiText>{"프로젝트 조교 초대"}</UiText></h2>
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {assistantInvitations.map((invitation) => (
                  <li key={invitation.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <strong><UiText>{invitation.topicTitle}</UiText></strong>
                      <p className="muted mt-1 text-sm">{invitation.inviterName} · <UiText>{invitation.advisorEnabled ? "지도교수와 동일한 프로젝트 운영 권한" : "프로젝트 운영 권한"}</UiText></p>
                    </div>
                    <ProjectAssistantInvitationDecisionForm invitationId={invitation.id} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {assistantTopics.some(({ team }) => !team) ? (
            <section aria-labelledby="assistant-topics-title">
              <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <p className="eyebrow"><UiText>{"조교 권한"}</UiText></p>
                  <h2 id="assistant-topics-title" className="mt-1 text-xl font-bold"><UiText>{"운영 준비 중인 프로젝트"}</UiText></h2>
                </div>
              </div>
              <ul className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
                {assistantTopics.filter(({ team }) => !team).map((topic) => (
                  <li key={topic.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <strong><UiText>{topic.title}</UiText></strong>
                      <p className="muted mt-1 text-sm">{topic.program.name} · <UiText>{topic.status === "DRAFT" ? "초안" : topic.status === "PUBLISHED" ? "공개" : "마감"}</UiText></p>
                    </div>
                    <Link href={`/professor/topics/${topic.id}`} className="button-secondary"><UiText>{"프로젝트 관리"}</UiText></Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {actor.role === "PROFESSOR" && pendingApprovals.length > 0 ? (
            <ProjectApprovalLedger requests={pendingApprovals} student={false} />
          ) : actor.role === "PROFESSOR" && view === "all" ? (
            <section aria-labelledby="approval-empty-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 id="approval-empty-title" className="text-xl font-black tracking-[-0.03em]"><UiText>{"승인 대기열"}</UiText></h2>
                  <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"제안 내용과 요청 경로를 확인한 뒤 처리합니다."}</UiText></p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[var(--muted)]">0<UiText>{"건"}</UiText></span>
              </div>
              <EmptyState variant="embedded" title="검토할 승인 요청이 없습니다" description="새 승인 요청이 도착하면 이곳에서 바로 확인할 수 있습니다." />
            </section>
          ) : null}

          {view === "all" && !hasAnyProject ? (
            <EmptyState title="아직 연결된 프로젝트가 없습니다" description={actor.role === "STUDENT" ? "관심 있는 프로젝트를 발견하고 첫 지원을 시작해 보세요." : "주제를 만들거나 학생 지원을 승인하면 팀이 연결됩니다."} />
          ) : null}

          {view === "all" && activeCount > 0 ? (
            <ProjectList
              role={actor.role}
              teams={teams.filter((team) => team.status !== "CLOSED")}
              view="active"
            />
          ) : null}
          {student && view === "all" && primaryApplicationPage && primaryApplicationPage.total > 0 ? (
            <ProjectApplicationList page={primaryApplicationPage} status="PENDING" preview />
          ) : null}
          {view === "all" && completedCount > 0 ? (
            <ProjectList
              role={actor.role}
              teams={teams.filter((team) => team.status === "CLOSED")}
              view="completed"
            />
          ) : null}
          {student && view === "all" && secondaryApplicationPage && secondaryApplicationPage.total > 0 ? (
            <ProjectApplicationList page={secondaryApplicationPage} status="REJECTED" preview />
          ) : null}

          {student && view === "pending" && primaryApplicationPage ? (
            <ProjectApplicationList page={primaryApplicationPage} status="PENDING" />
          ) : null}
          {student && view === "rejected" && primaryApplicationPage ? (
            <ProjectApplicationList page={primaryApplicationPage} status="REJECTED" />
          ) : null}

          {(view === "active" || view === "completed") && visibleTeams.length > 0 ? (
            <ProjectList
              role={actor.role}
              teams={visibleTeams}
              view={view}
            />
          ) : null}
          {(view === "active" || view === "completed") && visibleTeams.length === 0 ? (
            <EmptyState
              title={view === "active" ? "진행 중인 프로젝트가 없습니다" : "완료한 프로젝트가 없습니다"}
              description={view === "active" && student ? "승인을 기다리거나 새로운 프로젝트를 찾아보세요." : "해당 상태의 프로젝트가 생기면 이곳에 표시됩니다."}
              action={view === "active" && student ? <Link href="/topics" className="button-secondary"><UiText>{"프로젝트 둘러보기"}</UiText></Link> : undefined}
            />
          ) : null}
          {(view === "all" || view === "active" || view === "completed") ? (
            <ProjectPagination
              page={teamPage.page}
              totalPages={teamPage.totalPages}
              ariaLabel="프로젝트 관리 페이지"
              href={(page) => {
                const params = new URLSearchParams();
                if (view !== "all") params.set("view", view);
                if (page > 1) params.set("page", String(page));
                const search = params.toString();
                return search ? `/dashboard?${search}` : "/dashboard";
              }}
            />
          ) : null}
        </div>
      </ProjectDashboardFrame>
    </AppShell>
  );
}
