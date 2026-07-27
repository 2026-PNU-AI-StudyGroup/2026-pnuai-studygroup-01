import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProjectDashboardHero } from "@/app/dashboard/_components/project-dashboard-hero";
import { ProjectDashboardSidebar } from "@/app/dashboard/_components/project-dashboard-sidebar";
import { ProjectApplicationList } from "@/app/dashboard/_components/project-application-list";
import { ProjectList } from "@/app/dashboard/_components/project-list";
import {
  buildProjectDashboardCounts,
  parseProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamWorkspaceQueryService } from "@/modules/team/application/manage-team-workspace";
import { PrismaTeamWorkspaceQueryRepository } from "@/modules/team/infrastructure/prisma-team-workspace-query-repository";
import { ListOwnTopicApplicationsService } from "@/modules/topic-application/application/list-own-topic-applications";
import { PrismaTopicApplicationQueryRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: SearchParamValue;
    page?: SearchParamValue;
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
  const teamPromise = new TeamWorkspaceQueryService(
    new PrismaTeamWorkspaceQueryRepository(prisma),
  ).list(actor);
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
  const [teams, primaryApplicationPage, secondaryApplicationPage] = await Promise.all([
    teamPromise,
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
