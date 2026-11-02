import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { ArchivedProjectDetail } from "@/app/topics/_components/archived-project-detail";
import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { isTopicRecruiting, ProjectApplicationAction } from "@/app/topics/_components/project-application-action";
import { ProjectMediaCarousel } from "@/app/topics/_components/project-media-carousel";
import {
  buildShowcaseMedia,
  ProjectArtifactSection,
  ProjectRepositoryCallout,
  resolveShowcaseRepository,
} from "@/app/topics/_components/project-showcase-sections";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { ProgramScheduleCard } from "@/app/topics/_components/project-portal-chrome";
import { cardClass, CardHead, daysUntil, KpiStrip, ObjectHeader, Pill, Thumb } from "@/modules/project-program/ui/work-screen";
import { buildAdminProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { loadProgramSidebarItems } from "@/app/topics/_lib/load-program-sidebar-items";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { TeamWorkspaceQueryService } from "@/modules/team/application/manage-team-workspace";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { PrismaTeamWorkspaceQueryRepository } from "@/modules/team/infrastructure/prisma-team-workspace-query-repository";
import { ListAdminTopicPreviewService } from "@/modules/topic/application/list-admin-topic-preview";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { teamStatusPresentation } from "@/modules/team/ui/team-status-presentation";
import { ProgramIcon } from "@/shared/ui/program-icon";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { SettingsIcon } from "@/shared/ui/workspace-icons";

const monthDay = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 상세");
}

export default async function TopicDetailPage({ params, searchParams }: { params: Promise<{ topicId: string }>; searchParams: Promise<{ view?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  // 팀원과 담당 교수, 조교에게 프로젝트 주소는 하나다. 소개와 작업 공간이 따로 있으면 둘 사이를
  // 오가며 같은 정보를 두 번 읽는다. 방문자에게 어떻게 보이는지는 작업 공간에서 ?view=public 으로 연다.
  // 관리자는 모든 작업 공간이 열리지만 상세를 보며 평가하는 일이 많아 바로 보내지 않고 버튼만 둔다.
  // 자문위원도 권한 조건상 작업 공간이 열리지만 심사는 /advisor 화면에서 하므로 버튼도 두지 않는다.
  const canOpenWorkspace = actor.role !== "ADVISOR"
    && await new TeamWorkspaceQueryService(new PrismaTeamWorkspaceQueryRepository(prisma)).canOpen(actor, topicId);
  if (canOpenWorkspace && actor.role !== "ADMIN" && (await searchParams).view !== "public") redirect(`/projects/${topicId}`);
  const workspaceLink = canOpenWorkspace
    ? <Link href={`/projects/${topicId}`} className="button-secondary button-compact gap-1.5"><SettingsIcon className="size-4 shrink-0" /><UiText>{"진행 현황"}</UiText></Link>
    : null;
  const audience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const archivedProject = await new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma, audience)).find(topicId);

  if (archivedProject) {
    const [sidebarItems, ballot, categoryOrder] = await Promise.all([
      loadProgramSidebarItems("past", {}, audience),
      new ProjectVotingService(new PrismaProjectVotingRepository(prisma)).getBallot(actor, archivedProject.programId),
      listProgramCategoryOrder(prisma),
    ]);
    return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topicId}`} crumbs={[{ label: archivedProject.programName, href: `/topics?view=past&programId=${encodeURIComponent(archivedProject.programId)}` }, { label: archivedProject.topicTitle }]} panel={<ProgramSidebar items={sidebarItems} selectedId={archivedProject.programId} showSettings={actor.role === "ADMIN"} categoryOrder={categoryOrder} />}><ExplorerLayout>
      <ArchivedProjectDetail project={archivedProject} ballot={ballot ?? undefined} workspaceLink={workspaceLink} /></ExplorerLayout></AppShell>;
  }

  const topicRepository = new PrismaTopicQueryRepository(prisma, audience);
  const topic = actor.role === "ADMIN"
    ? await new ListAdminTopicPreviewService(topicRepository).find(actor, topicId)
    : await new ListPublishedTopicsService(topicRepository).find(topicId, actor.role === "STUDENT" ? actor.id : undefined);
  if (!topic) notFound();

  const now = new Date();
  const recruiting = isTopicRecruiting(topic, now);
  const canApply = actor.role === "STUDENT" && !topic.studentProjectCreationEnabled;
  const [sidebarItems, categoryOrder, leaderTeams] = await Promise.all([
    actor.role === "ADMIN"
      ? new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listAll(actor).then((programs) => buildAdminProgramSidebarItems(programs, now))
      : loadProgramSidebarItems("active", {}, audience),
    listProgramCategoryOrder(prisma),
    canApply && recruiting && !topic.ownApplicationStatus
      ? new PrismaStudentTeamRecruitmentQueryRepository(prisma).listLeaderTeams(actor.id)
      : Promise.resolve([]),
  ]);
  // 방문자가 이 프로젝트에 어떻게 들어오는지 한 자리에 둔다. 교수 제안 프로젝트는 여기서 지원하고,
  // 학생이 팀을 꾸리는 프로그램은 팀 모집에서 합류한다.
  const applicationAction = <ProjectApplicationAction topic={topic} canApply={canApply} recruiting={recruiting} leaderTeams={leaderTeams} />;
  const joinGuide = actor.role === "STUDENT" && topic.studentProjectCreationEnabled && topic.programExecutionEndsAt > now
    ? <Link href="/recruitments" className="button-secondary button-compact"><UiText>{"팀 모집에서 합류"}</UiText></Link>
    : null;
  const { media, embeddedIds, galleryIds } = buildShowcaseMedia({
    artifacts: topic.artifacts,
    title: topic.title,
    thumbnailPath: topic.thumbnailPath,
    posterPath: topic.posterPath,
  });
  // 심사는 저장소의 리드미를 읽고 이뤄진다. 사진과 소개 아래에 묻히지 않게 머리말로 올린다.
  const repository = resolveShowcaseRepository({ artifacts: topic.artifacts, sourceUrl: topic.sourceUrl });
  const teamLeader = topic.teamMembers?.find(({ role }) => role === "LEADER");
  const teamMembers = topic.teamMembers?.filter(({ role }) => role === "MEMBER") ?? [];

  const status = recruiting
    ? { label: "모집 중", tone: "accent" as const }
    : topic.effectiveStatus === "PENDING_APPROVAL" ? { label: "승인 대기", tone: "warning" as const }
      : topic.effectiveStatus === "REJECTED" ? { label: "반려됨", tone: "danger" as const }
        : { label: teamStatusPresentation[topic.effectiveStatus].label, tone: topic.effectiveStatus === "IN_PROGRESS" ? "accent" as const : "plain" as const };
  // 머리 한 줄. 모집 중이면 남은 자리와 마감, 투표 중이면 투표 마감. 수행 기간은 숫자 판에 있어 되풀이하지 않는다.
  const finding = recruiting && topic.programRecruitmentEndsAt
    ? `남은 자리 ${topic.capacity - topic.memberCount}명, 모집은 ${monthDay.format(topic.programRecruitmentEndsAt)}에 마감합니다.`
    : topic.programVotingStartsAt && topic.programVotingEndsAt && topic.programVotingStartsAt <= now && now < topic.programVotingEndsAt
      ? `투표는 ${monthDay.format(topic.programVotingEndsAt)}까지 열려 있습니다.`
      : undefined;
  const executionDaysLeft = daysUntil(topic.programExecutionEndsAt, now);
  const people: Array<[string, string[]]> = topic.studentProjectCreationEnabled
    ? [["팀장", teamLeader ? [teamLeader.name] : []], ["팀원", teamMembers.map(({ name }) => name)]]
    : [["등록자", [topic.authorName]], ...(topic.teamMembers?.length ? [["팀원", topic.teamMembers.map(({ name }) => name)] as [string, string[]]] : [])];
  if (topic.professorName) people.push(["지도교수", [topic.professorName]]);
  const hasApplicationAction = Boolean(topic.ownApplicationStatus || (canApply && recruiting));

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topic.id}`} crumbs={[{ label: topic.programName, href: `/topics?programId=${encodeURIComponent(topic.programId)}` }, { label: topic.title }]} panel={<ProgramSidebar items={sidebarItems} selectedId={topic.programId} selectedName={topic.programName} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} categoryOrder={categoryOrder} />}>
    <ExplorerLayout>
      <ProjectDetailShell
        header={(
          <ObjectHeader
            id="project-title"
            media={<Thumb src={topic.thumbnailPath} fallback={<ProgramIcon icon={topic.programIcon} />} className="h-[3.875rem] w-[3.125rem]" />}
            title={<UiText>{topic.title}</UiText>}
            titleAside={<Pill tone={status.tone}>{status.label}</Pill>}
            meta={<><UiText>{topic.programName}</UiText>{topic.divisionName ? <>, <UiText>{topic.divisionName}</UiText></> : null}{topic.teamName ? <>, <UiText>{`${topic.teamName} 팀`}</UiText></> : null}</>}
            finding={finding ? <UiText>{finding}</UiText> : undefined}
            actions={(
              <>
                {workspaceLink}
                {repository ? <ProjectRepositoryCallout repository={repository} primary={!hasApplicationAction} /> : null}
                {joinGuide}
                {hasApplicationAction ? <div className="min-w-32">{applicationAction}</div> : null}
              </>
            )}
          />
        )}
        kpis={(
          <KpiStrip items={[
            { label: "팀원", value: topic.memberCount, unit: "명", note: <UiText>{`정원 ${topic.capacity}명`}</UiText> },
            { label: "공개 결과물", value: topic.artifacts.length, unit: "개" },
            { label: "수행 종료까지", value: Math.max(0, executionDaysLeft), unit: "일", note: <UiDate value={topic.programExecutionEndsAt} /> },
          ]} />
        )}
        side={(
          <>
            <section aria-labelledby="project-people-title" className={cardClass}>
              <CardHead id="project-people-title" title={<UiText>{"팀"}</UiText>} count={<UiText>{`${topic.memberCount}명`}</UiText>} />
              <dl className="px-5 pb-3 text-[0.8125rem]">
                {people.map(([label, names]) => (
                  <div key={label} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2 [&+div]:border-t [&+div]:border-[var(--line)]">
                    <dt className="text-[var(--muted)]"><UiText>{label}</UiText></dt>
                    <dd className="min-w-0 text-[var(--ink)]">{names.length ? names.join(", ") : <span className="text-[var(--muted)]">-</span>}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <ProgramScheduleCard now={now} program={{
              name: topic.programName,
              category: topic.programCategory,
              recruitmentStartsAt: topic.programRecruitmentStartsAt,
              recruitmentEndsAt: topic.programRecruitmentEndsAt,
              executionStartsAt: topic.programExecutionStartsAt,
              executionEndsAt: topic.programExecutionEndsAt,
              votingPolicy: topic.programVotingStartsAt && topic.programVotingEndsAt ? { startsAt: topic.programVotingStartsAt, endsAt: topic.programVotingEndsAt } : null,
            }} />
          </>
        )}
      >
        <section aria-labelledby="topic-description" className={`${cardClass} pb-5`}>
          <CardHead id="topic-description" title={<UiText>{"프로젝트 소개"}</UiText>} />
          {media.length ? <div className="px-5 pb-4"><ProjectMediaCarousel items={media} /></div> : null}
          <LocalizedMarkdown text={topic.showcaseIntro ?? topic.description} className="max-w-3xl space-y-3 px-5 text-[0.9375rem] leading-7 text-[var(--ink)]" />
        </section>
        <ProjectArtifactSection artifacts={topic.artifacts} sourceUrl={topic.sourceUrl} embeddedIds={embeddedIds} galleryIds={galleryIds} repositoryShownAbove={Boolean(repository)} />
        {recruiting ? (
          <section aria-labelledby="topic-requirements" className={cardClass}>
            <CardHead id="topic-requirements" title={<UiText>{"지원 조건"}</UiText>} />
            <dl className="px-5 pb-3">
              {[["필수 기술", topic.requiredSkills.join(", ") || "별도 조건 없음"], ["우대 기술", topic.preferredSkills.join(", ") || "별도 조건 없음"], ["예상 역할", topic.roleExpectations], ["활동 조건", topic.availabilityRequirement]].map(([label, value]) => (
                <div key={label} className="grid gap-1 py-2.5 text-sm [&+div]:border-t [&+div]:border-[var(--line)] sm:grid-cols-[7rem_minmax(0,1fr)]">
                  <dt className="text-[var(--muted)]"><UiText>{label}</UiText></dt>
                  <dd className="leading-6 text-[var(--ink)]"><UiText>{value}</UiText></dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </ProjectDetailShell>
    </ExplorerLayout>
  </AppShell>;
}
