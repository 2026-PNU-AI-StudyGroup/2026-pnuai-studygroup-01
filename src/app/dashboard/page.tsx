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
import { StudentReviewList } from "@/app/dashboard/_components/student-review-list";
import { ProjectApprovalLedger } from "@/app/_components/project-approval-ledger";
import {
  buildProjectDashboardCounts,
  parseProjectDashboardView,
  type ProjectDashboardCounts,
  type ProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";
import { ProjectTeamInvitationDecisionForm } from "@/app/_components/project-team-invitation-decision-form";
import { PrismaProjectTeamInvitationRepository } from "@/modules/project-team/infrastructure/prisma-project-team-invitation-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamWorkspaceQueryService } from "@/modules/team/application/manage-team-workspace";
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
import { ProfileIcon, SearchIcon, SettingsIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트");
}

function ProjectDashboardFrame({ role, counts, view, children }: {
  role: "STUDENT" | "PROFESSOR" | "ADVISOR";
  counts: ProjectDashboardCounts;
  view: ProjectDashboardView;
  children: ReactNode;
}) {
  return (
    <ExplorerLayout sidebar={<ProjectDashboardSidebar counts={counts} selectedView={view} student={role === "STUDENT"} />}>
      <ProjectDashboardHero role={role} />
      {children}
    </ExplorerLayout>
  );
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
  // 자문위원은 배정된 프로젝트만 다루므로 전용 화면으로 보낸다(이 대시보드는 항상 비어 있다).
  if (actor.role === "ADVISOR") redirect("/advisor");
  const params = await searchParams;
  const student = actor.role === "STUDENT";
  const requestedView = parseProjectDashboardView(firstSearchParam(params.view));
  const view = !student && (requestedView === "pending" || requestedView === "rejected")
    ? "all"
    : requestedView;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  if (actor.role === "ADMIN") {
    const selectedProgramId = firstSearchParam(params.programId)?.trim().slice(0, 200);
    redirect(selectedProgramId ? `/topics?programId=${encodeURIComponent(selectedProgramId)}` : "/topics");
  }

  const teamStatus = view === "active" ? "ACTIVE" : view === "completed" ? "COMPLETED" : undefined;
  const reviewPageSize = 20;
  const reviewFetchSize = view === "pending"
    ? Math.max(1, requestedPage) * reviewPageSize
    : reviewPageSize;
  const teamPagePromise = new TeamWorkspaceQueryService(
    new PrismaTeamWorkspaceQueryRepository(prisma),
  ).listPage(actor, view === "all" || teamStatus ? requestedPage : 1, teamStatus);
  // 계정이 없을 때 보낸 초대는 사람 대신 주소만 달려 있어 주소로도 찾는다.
  const teamInvitationsPromise = new PrismaProjectTeamInvitationRepository(prisma, actor)
    .listReceived(actor.id, actor.email);
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
      projectTeam: { select: { id: true } },
    },
  });
  const approvalService = new TopicApprovalService(
    new PrismaTopicApprovalRepository(prisma),
    new PrismaProjectProgramRepository(prisma),
  );
  const pendingApprovalPromise = actor.role === "PROFESSOR"
    ? approvalService.listPendingForReview(actor)
    : Promise.resolve([]);
  const ownPendingApprovalPromise = student
    ? approvalService.list(actor, 1, reviewFetchSize, { status: "PENDING" })
    : Promise.resolve(null);
  const applicationService = student
    ? new ListOwnTopicApplicationsService(
        new PrismaTopicApplicationQueryRepository(prisma),
      )
    : null;
  const primaryApplicationPromise = applicationService
    ? applicationService.execute(
        actor,
        view === "rejected" ? requestedPage : 1,
        view === "pending" ? reviewFetchSize : 20,
        view === "rejected" ? "REJECTED" : "PENDING",
      )
    : null;
  const secondaryApplicationPromise = applicationService && view === "all"
    ? applicationService.execute(actor, 1, 20, "REJECTED")
    : null;
  const [teamPage, teamInvitations, assistantInvitations, assistantTopics, pendingApprovals, ownPendingApprovalPage, primaryApplicationPage, secondaryApplicationPage] = await Promise.all([
    teamPagePromise,
    teamInvitationsPromise,
    assistantInvitationsPromise,
    assistantTopicsPromise,
    pendingApprovalPromise,
    ownPendingApprovalPromise,
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
    pending: applicationCounts.PENDING + (ownPendingApprovalPage?.total ?? 0),
    rejected: applicationCounts.REJECTED,
    active: activeCount,
    completed: completedCount,
  });
  const visibleTeams = view === "active"
    ? teams.filter((team) => team.status !== "COMPLETED")
    : view === "completed"
      ? teams.filter((team) => team.status === "COMPLETED")
      : teams;
  const hasAnyProject = counts.all > 0;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard">
      <ProjectDashboardFrame role={actor.role} counts={counts} view={view}>
        <div className="page-enter space-y-8 pt-5">
          {teamInvitations.length > 0 ? (
            <section aria-labelledby="team-invitations-title" className="border-y border-[var(--line)] bg-[var(--primary-subtle)] px-5 py-5">
              <h2 id="team-invitations-title" className="text-lg font-bold"><UiText>{"프로젝트 팀 초대"}</UiText></h2>
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {teamInvitations.map((invitation) => (
                  <li key={invitation.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <strong><UiText>{invitation.projectTitle}</UiText></strong>
                      <p className="muted mt-1 text-sm">
                        <UiText>{invitation.programName}</UiText>{" · "}{invitation.invitedByName}
                        {" "}<UiText>{"님이 초대했습니다"}</UiText>
                      </p>
                    </div>
                    <ProjectTeamInvitationDecisionForm invitationId={invitation.id} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {assistantInvitations.length > 0 ? (
            <section aria-labelledby="assistant-invitations-title" className="border-y border-[var(--line)] bg-[var(--primary-subtle)] px-5 py-5">
              <h2 id="assistant-invitations-title" className="text-lg font-bold"><UiText>{"프로젝트 조교 초대"}</UiText></h2>
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {assistantInvitations.map((invitation) => (
                  <li key={invitation.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <strong><UiText>{invitation.topicTitle}</UiText></strong>
                      <p className="muted mt-1 text-sm">{invitation.inviterName} · <UiText>{"프로젝트 관리 권한"}</UiText></p>
                    </div>
                    <ProjectAssistantInvitationDecisionForm invitationId={invitation.id} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {assistantTopics.some(({ projectTeam }) => !projectTeam) ? (
            <section aria-labelledby="assistant-topics-title">
              <div className="flex items-end justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <p className="eyebrow"><UiText>{"조교 권한"}</UiText></p>
                  <h2 id="assistant-topics-title" className="mt-1 text-xl font-bold"><UiText>{"운영 준비 중인 프로젝트"}</UiText></h2>
                </div>
              </div>
              <ul className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
                {assistantTopics.filter(({ projectTeam }) => !projectTeam).map((topic) => (
                  <li key={topic.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <strong><UiText>{topic.title}</UiText></strong>
                      <p className="muted mt-1 text-sm">{topic.program.name} · <UiText>{topic.status === "PENDING_APPROVAL" ? "승인 대기" : topic.status === "ACTIVE" ? "공개" : topic.status === "REJECTED" ? "반려됨" : "마감"}</UiText></p>
                    </div>
                    <Link href={`/professor/topics/${topic.id}`} className="button-secondary gap-2"><SettingsIcon className="size-4 shrink-0" /><UiText>{"프로젝트 관리"}</UiText></Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {actor.role === "PROFESSOR" && pendingApprovals.length > 0 ? (
            <ProjectApprovalLedger requests={pendingApprovals} student={false} />
          ) : actor.role === "PROFESSOR" && view === "all" ? (
            <section aria-labelledby="approval-empty-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
              <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
                <h2 id="approval-empty-title" className="text-lg font-bold tracking-[-0.03em]"><UiText>{"승인 대기"}</UiText></h2>
                <span className="shrink-0 rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-bold text-[var(--muted)]">0<UiText>{"건"}</UiText></span>
              </header>
              <div className="px-5 sm:px-6"><EmptyState variant="section" title="검토할 승인 요청이 없습니다" description="새 승인 요청이 도착하면 이곳에 표시됩니다." /></div>
            </section>
          ) : null}

          {view === "all" && !hasAnyProject ? (
            <EmptyState
              title="아직 연결된 프로젝트가 없습니다"
              description={student ? "참여할 프로젝트를 찾거나 팀 모집 공고에 지원해 보세요." : "프로젝트를 등록하거나 학생 지원을 승인하면 팀이 연결됩니다."}
              action={student ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/topics" className="button-primary gap-2"><SearchIcon className="size-4 shrink-0" /><UiText>{"프로젝트 찾기"}</UiText></Link>
                  <Link href="/recruitments" className="button-secondary gap-2"><ProfileIcon className="size-4 shrink-0" /><UiText>{"팀 모집 둘러보기"}</UiText></Link>
                </div>
              ) : undefined}
            />
          ) : null}

          {view === "all" && activeCount > 0 ? (
            <ProjectList
              role={actor.role}
              teams={teams.filter((team) => team.status === "IN_PROGRESS")}
              view="active"
            />
          ) : null}
          {student && view === "all" && primaryApplicationPage && ownPendingApprovalPage ? (
            <StudentReviewList applications={primaryApplicationPage.items} registrations={ownPendingApprovalPage.items} total={primaryApplicationPage.total + ownPendingApprovalPage.total} preview />
          ) : null}
          {view === "all" && completedCount > 0 ? (
            <ProjectList
              role={actor.role}
              teams={teams.filter((team) => team.status === "COMPLETED")}
              view="completed"
            />
          ) : null}
          {student && view === "all" && secondaryApplicationPage && secondaryApplicationPage.total > 0 ? (
            <ProjectApplicationList page={secondaryApplicationPage} status="REJECTED" preview />
          ) : null}

          {student && view === "pending" && primaryApplicationPage && ownPendingApprovalPage ? (
            <StudentReviewList applications={primaryApplicationPage.items} registrations={ownPendingApprovalPage.items} total={primaryApplicationPage.total + ownPendingApprovalPage.total} page={requestedPage} pageSize={reviewPageSize} />
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
              description={view === "active" && student ? "지원 승인 상태를 확인하거나 참여할 프로젝트를 확인하세요." : undefined}
              action={view === "active" && student ? <Link href="/topics" className="button-secondary"><UiText>{"프로젝트 목록"}</UiText></Link> : undefined}
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
