import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProjectDashboardHero } from "@/app/dashboard/_components/project-dashboard-hero";
import { ProjectDashboardSidebar } from "@/app/dashboard/_components/project-dashboard-sidebar";
import { ProjectApplicationList } from "@/app/dashboard/_components/project-application-list";
import { ProjectList } from "@/app/dashboard/_components/project-list";
import { AdminProjectOverview } from "@/app/dashboard/_components/admin-project-overview";
import { ProjectApprovalLedger } from "@/app/project-approvals/_components/project-approval-ledger";
import {
  buildProjectDashboardCounts,
  parseProjectDashboardView,
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
import { ProjectAssistantInvitationDecisionForm } from "@/modules/project-assistant/ui/project-assistant-controls";
import { ProjectAssistantQueryService } from "@/modules/project-assistant/application/manage-project-assistants";
import { PrismaProjectAssistantRepository } from "@/modules/project-assistant/infrastructure/prisma-project-assistant-repository";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트");
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

  const teamPromise = new TeamWorkspaceQueryService(
    new PrismaTeamWorkspaceQueryRepository(prisma),
  ).list(actor);
  const assistantInvitationsPromise = new ProjectAssistantQueryService(
    new PrismaProjectAssistantRepository(prisma),
  ).listPending(actor);
  const assistantTopicsPromise = prisma.topic.findMany({
    where: { assistants: { some: { userId: actor.id } } },
    orderBy: { createdAt: "desc" },
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
  const [teams, assistantInvitations, assistantTopics, pendingApprovals, primaryApplicationPage, secondaryApplicationPage] = await Promise.all([
    teamPromise,
    assistantInvitationsPromise,
    assistantTopicsPromise,
    pendingApprovalPromise,
    primaryApplicationPromise,
    secondaryApplicationPromise,
  ]);
  const activeCount = teams.filter((team) => team.status !== "CLOSED").length;
  const completedCount = teams.length - activeCount;
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
      <ExplorerLayout
        sidebar={
          <ProjectDashboardSidebar
            counts={counts}
            selectedView={view}
            student={student}
          />
        }
      >
        <ProjectDashboardHero role={actor.role} />
        <div className="page-enter space-y-8 pt-5">
          {assistantInvitations.length > 0 ? (
            <section aria-labelledby="assistant-invitations-title" className="border-y border-[var(--line)] bg-[var(--primary-subtle)] px-5 py-5">
              <h2 id="assistant-invitations-title" className="text-lg font-extrabold"><UiText>{"프로젝트 조교 초대"}</UiText></h2>
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
                  <h2 id="assistant-topics-title" className="mt-1 text-xl font-extrabold"><UiText>{"운영 준비 중인 프로젝트"}</UiText></h2>
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
          ) : null}

          {view === "all" && !hasAnyProject ? (
            <EmptyState title="아직 연결된 프로젝트가 없습니다" description={actor.role === "STUDENT" ? "관심 있는 프로젝트를 발견하고 첫 지원을 시작해 보세요." : "주제를 만들거나 학생 지원을 승인하면 팀이 연결됩니다."} action={<Link href={actor.role === "STUDENT" ? "/topics" : "/professor/topics"} className="button-secondary"><UiText>{actor.role === "STUDENT" ? "프로젝트 둘러보기" : "새 주제 만들기"}</UiText></Link>} />
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
        </div>
      </ExplorerLayout>
    </AppShell>
  );
}
