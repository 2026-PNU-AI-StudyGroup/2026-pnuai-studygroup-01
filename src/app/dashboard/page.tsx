import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ProjectDashboardHero } from "@/app/dashboard/_components/project-dashboard-hero";
import { ProjectDashboardSidebar } from "@/app/dashboard/_components/project-dashboard-sidebar";
import { ProjectApplicationList } from "@/app/dashboard/_components/project-application-list";
import { DeadlineList, ProjectList } from "@/app/dashboard/_components/project-list";
import { StudentReviewList } from "@/app/dashboard/_components/student-review-list";
import { ProjectApprovalLedger } from "@/app/_components/project-approval-ledger";
import {
  buildProjectDashboardCounts,
  collectDashboardDeadlines,
  parseProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";
import { cardClass, CardHead, daysUntil } from "@/modules/project-program/ui/work-screen";
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

const dayWithWeekday = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" });

function ProjectDashboardFrame({ role, finding, primaryAction, children }: {
  role: "STUDENT" | "PROFESSOR" | "ADVISOR";
  finding?: ReactNode;
  primaryAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ExplorerLayout>
      <div className="grid gap-3.5">
        <ProjectDashboardHero role={role} finding={finding} primaryAction={primaryAction} />
        {children}
      </div>
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
  const now = new Date();
  // 마감은 진행 중 프로젝트의 아직 안 낸 필수 보고서와 끝나지 않은 할 일이다. 보고서 마감일은 목록 조회에 없어 따로 읽는다.
  const liveTeamIds = teams.filter(({ status }) => status === "IN_PROGRESS").map(({ id }) => id);
  const openReports = liveTeamIds.length
    ? await prisma.report.findMany({
      where: { projectTeam: { projectId: { in: liveTeamIds } }, required: true, submissionEnabled: true, versions: { none: {} } },
      orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      select: { id: true, titleSnapshot: true, dueAt: true, projectTeam: { select: { projectId: true } } },
    })
    : [];
  const deadlines = collectDashboardDeadlines(
    teams,
    openReports.map((report) => ({ id: report.id, projectId: report.projectTeam.projectId, title: report.titleSnapshot, dueAt: report.dueAt })),
  );
  const nextDeadline = deadlines.find(({ dueAt }) => daysUntil(dueAt, now) >= 0);
  const missedCount = deadlines.filter(({ dueAt }) => daysUntil(dueAt, now) < 0).length;
  const nextReport = deadlines.find(({ kind, dueAt }) => kind === "REPORT" && daysUntil(dueAt, now) >= 0);
  const nextDays = nextDeadline ? daysUntil(nextDeadline.dueAt, now) : 0;
  const finding = nextDeadline ? (
    <>
      <b className="font-semibold"><UiText>{nextDays === 0 ? `${nextDeadline.title} 마감이 오늘입니다` : `${nextDeadline.title} 마감이 ${nextDays}일 남았습니다`}</UiText></b>
      {" "}<UiText>{`(${dayWithWeekday.format(nextDeadline.dueAt)}, ${nextDeadline.projectTitle}).`}</UiText>
      {missedCount ? <>{" "}<UiText>{`기한을 넘긴 마감이 ${missedCount}건 있습니다.`}</UiText></> : null}
    </>
  ) : missedCount ? (
    <b className="font-semibold"><UiText>{`기한을 넘긴 마감이 ${missedCount}건 있습니다.`}</UiText></b>
  ) : liveTeamIds.length ? (
    <UiText>{"진행 중인 프로젝트에 남은 마감이 없습니다."}</UiText>
  ) : undefined;
  const primaryAction = student && nextReport
    ? <Link href={`/projects/${nextReport.projectId}/reports`} className="button-primary button-compact"><UiText>{"보고서 제출"}</UiText></Link>
    : undefined;
  const invitationCount = teamInvitations.length + assistantInvitations.length;
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
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/dashboard" panel={<ProjectDashboardSidebar counts={counts} selectedView={view} student={actor.role === "STUDENT"} />}>
      <ProjectDashboardFrame role={actor.role} finding={finding} primaryAction={primaryAction}>
          {(view === "all" || view === "active") && (liveTeamIds.length > 0 || invitationCount > 0) ? (
            <div className="@container">
              <div className={`grid items-start gap-3.5 ${invitationCount > 0 && liveTeamIds.length > 0 ? "@min-[68rem]:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
                {liveTeamIds.length > 0 ? <DeadlineList deadlines={deadlines} now={now} /> : null}
                {invitationCount > 0 ? (
                  <section aria-labelledby="invitations-title" className={cardClass}>
                    <CardHead id="invitations-title" title={<UiText>{"받은 초대"}</UiText>} count={<>{invitationCount}<UiText>{"건"}</UiText></>} />
                    <ul className="[&_:is(.button-primary,.button-secondary)]:min-h-[2.125rem] [&_:is(.button-primary,.button-secondary)]:px-3 [&_:is(.button-primary,.button-secondary)]:py-1 [&_:is(.button-primary,.button-secondary)]:text-[0.8125rem]">
                      {teamInvitations.map((invitation) => (
                        <li key={invitation.id} className="grid gap-2.5 border-t border-[var(--line)] px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-5"><UiText>{invitation.projectTitle}</UiText></p>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              <UiText>{`팀 초대, ${invitation.programName}, ${invitation.invitedByName} 님이 보냄`}</UiText>
                            </p>
                          </div>
                          <ProjectTeamInvitationDecisionForm invitationId={invitation.id} />
                        </li>
                      ))}
                      {assistantInvitations.map((invitation) => (
                        <li key={invitation.id} className="grid gap-2.5 border-t border-[var(--line)] px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-5"><UiText>{invitation.topicTitle}</UiText></p>
                            <p className="mt-0.5 text-xs text-[var(--muted)]"><UiText>{`조교 초대, 프로젝트 관리 권한, ${invitation.inviterName} 님이 보냄`}</UiText></p>
                          </div>
                          <ProjectAssistantInvitationDecisionForm invitationId={invitation.id} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>
          ) : null}
          {assistantTopics.some(({ projectTeam }) => !projectTeam) ? (
            <section aria-labelledby="assistant-topics-title" className={cardClass}>
              <CardHead id="assistant-topics-title" title={<UiText>{"운영 준비 중인 프로젝트"}</UiText>} count={<UiText>{"조교 권한"}</UiText>} />
              <ul>
                {assistantTopics.filter(({ projectTeam }) => !projectTeam).map((topic) => (
                  <li key={topic.id} className="grid gap-2 border-t border-[var(--line)] px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-5"><UiText>{topic.title}</UiText></p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]"><UiText>{`${topic.program.name}, ${topic.status === "PENDING_APPROVAL" ? "승인 대기" : topic.status === "ACTIVE" ? "공개" : topic.status === "REJECTED" ? "반려됨" : "마감"}`}</UiText></p>
                    </div>
                    <Link href={`/professor/topics/${topic.id}`} className="button-secondary button-compact gap-1.5"><SettingsIcon className="size-4 shrink-0" /><UiText>{"프로젝트 관리"}</UiText></Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {actor.role === "PROFESSOR" && pendingApprovals.length > 0 ? (
            <ProjectApprovalLedger requests={pendingApprovals} student={false} />
          ) : actor.role === "PROFESSOR" && view === "all" ? (
            <section aria-labelledby="approval-empty-title" className={cardClass}>
              <CardHead id="approval-empty-title" title={<UiText>{"승인 대기"}</UiText>} count={<>0<UiText>{"건"}</UiText></>} />
              <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"검토할 승인 요청이 없습니다. 새 요청이 오면 여기에 보입니다."}</UiText></p>
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

          {view === "all" && activeCount + completedCount > 0 ? (
            <ProjectList
              role={actor.role}
              teams={[...teams].sort((left, right) => Number(left.status !== "IN_PROGRESS") - Number(right.status !== "IN_PROGRESS"))}
              view="all"
              now={now}
            />
          ) : null}
          {student && view === "all" && primaryApplicationPage && ownPendingApprovalPage ? (
            <StudentReviewList applications={primaryApplicationPage.items} registrations={ownPendingApprovalPage.items} total={primaryApplicationPage.total + ownPendingApprovalPage.total} preview />
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
              now={now}
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
      </ProjectDashboardFrame>
    </AppShell>
  );
}
