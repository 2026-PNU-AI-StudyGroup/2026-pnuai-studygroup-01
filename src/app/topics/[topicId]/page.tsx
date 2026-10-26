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
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { SettingsIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 상세");
}

export default async function TopicDetailPage({ params, searchParams }: { params: Promise<{ topicId: string }>; searchParams: Promise<{ view?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  // 작업 공간에 들어갈 수 있는 사람(팀원, 지도교수, 관리자)에게 프로젝트 주소는 하나다.
  // 소개와 작업 공간이 따로 있으면 둘 사이를 오가며 같은 정보를 두 번 읽는다.
  // 방문자에게 어떻게 보이는지는 작업 공간에서 ?view=public 으로 연다.
  // 자문위원은 권한 조건상 작업 공간이 열리지만 심사는 /advisor 화면에서 한다. 팀 대화와 할 일이
  // 있는 작업 공간으로 보내지 않고 예전처럼 소개를 보여 준다.
  const canOpenWorkspace = actor.role !== "ADVISOR"
    && await new TeamWorkspaceQueryService(new PrismaTeamWorkspaceQueryRepository(prisma)).canOpen(actor, topicId);
  if (canOpenWorkspace && (await searchParams).view !== "public") redirect(`/projects/${topicId}`);
  const workspaceLink = canOpenWorkspace
    ? <UiNav aria-label="프로젝트 관리" className="mb-5 flex justify-end"><Link href={`/projects/${topicId}`} className="button-secondary button-compact gap-2"><SettingsIcon className="size-4 shrink-0" /><UiText>{"작업 공간으로"}</UiText></Link></UiNav>
    : null;
  const audience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const archivedProject = await new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma, audience)).find(topicId);

  if (archivedProject) {
    const [sidebarItems, ballot, categoryOrder] = await Promise.all([
      loadProgramSidebarItems("past", {}, audience),
      new ProjectVotingService(new PrismaProjectVotingRepository(prisma)).getBallot(actor, archivedProject.programId),
      listProgramCategoryOrder(prisma),
    ]);
    return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topicId}`}><ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={archivedProject.programId} showSettings={actor.role === "ADMIN"} categoryOrder={categoryOrder} />}>
      {workspaceLink}
      <ArchivedProjectDetail project={archivedProject} ballot={ballot ?? undefined} /></ExplorerLayout></AppShell>;
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
    ? <p className="text-sm font-medium text-[var(--muted)]"><UiText>{"이 프로그램은 팀 모집에서 팀에 합류합니다."}</UiText>{" "}<Link href="/recruitments" className="font-bold text-[var(--primary)] hover:underline"><UiText>{"팀 모집 보기"}</UiText></Link></p>
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

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topic.id}`}>
    <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={topic.programId} selectedName={topic.programName} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} categoryOrder={categoryOrder} />}>
      <UiNav aria-label="이전 위치" className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href={`/topics?programId=${encodeURIComponent(topic.programId)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"><svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]"><path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg><UiText>{"프로젝트 목록"}</UiText></Link>{canOpenWorkspace ? <Link href={`/projects/${topic.id}`} className="button-secondary button-compact gap-2"><SettingsIcon className="size-4 shrink-0" /><UiText>{"작업 공간으로"}</UiText></Link> : null}</UiNav>
      <ProjectDetailShell
        headerAside={repository ? <ProjectRepositoryCallout repository={repository} /> : undefined}
        heading={<div className="mx-auto w-full max-w-4xl"><p className="text-sm font-semibold text-[var(--muted)]">{topic.programName}{topic.divisionName ? ` · ${topic.divisionName}` : ""}</p><h1 className="mt-3 text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.035em]"><UiText>{topic.title}</UiText></h1><div className="mt-6 space-y-2.5">{topic.studentProjectCreationEnabled ? <>{teamLeader ? <div className="flex flex-wrap items-center gap-2"><span className="w-16 shrink-0 text-xs font-semibold text-[var(--muted)]"><UiText>{"팀장"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{teamLeader.name}</span></div> : null}{teamMembers.length ? <div className="flex flex-wrap items-center gap-2"><span className="w-16 shrink-0 text-xs font-semibold text-[var(--muted)]"><UiText>{"팀원"}</UiText></span>{teamMembers.map(({ name }) => <span key={name} className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{name}</span>)}</div> : null}</> : <><div className="flex flex-wrap items-center gap-2"><span className="w-16 shrink-0 text-xs font-semibold text-[var(--muted)]"><UiText>{"등록자"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{topic.authorName}</span></div><div className="flex flex-wrap items-center gap-2"><span className="w-16 shrink-0 text-xs font-semibold text-[var(--muted)]"><UiText>{"모집 현황"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{topic.memberCount} / {topic.capacity}<UiText>{"명"}</UiText></span></div></>}</div>{joinGuide ? <div className="mt-6">{joinGuide}</div> : null}<div className="mt-6 max-w-xs empty:hidden">{applicationAction}</div></div>}
      >
        <div className="mx-auto max-w-4xl space-y-11">
          <ProjectMediaCarousel items={media} />
          <section aria-labelledby="topic-description"><h2 id="topic-description" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"프로젝트 소개"}</UiText></h2><LocalizedMarkdown text={topic.showcaseIntro ?? topic.description} className="mt-3 max-w-3xl space-y-3 text-[0.9375rem] leading-7 text-[var(--ink)]" /></section>
          <ProjectArtifactSection artifacts={topic.artifacts} sourceUrl={topic.sourceUrl} embeddedIds={embeddedIds} galleryIds={galleryIds} repositoryShownAbove={Boolean(repository)} />
          {recruiting ? <section aria-labelledby="topic-requirements"><h2 id="topic-requirements" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"지원 조건"}</UiText></h2><dl className="mt-3 border-t border-[var(--line)]">{[["필수 기술", topic.requiredSkills.join(", ") || "별도 조건 없음"], ["우대 기술", topic.preferredSkills.join(", ") || "별도 조건 없음"], ["예상 역할", topic.roleExpectations], ["활동 조건", topic.availabilityRequirement]].map(([label, value]) => <div key={label} className="grid gap-1 border-t border-[var(--line)] py-4 first:border-t-0 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="text-sm font-semibold leading-6 text-[var(--ink)]"><UiText>{value}</UiText></dd></div>)}</dl></section> : null}
        </div>
      </ProjectDetailShell>
    </ExplorerLayout>
  </AppShell>;
}
