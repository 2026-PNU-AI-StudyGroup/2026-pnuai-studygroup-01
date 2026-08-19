import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { ArchivedProjectDetail } from "@/app/topics/_components/archived-project-detail";
import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { ProjectMediaCarousel } from "@/app/topics/_components/project-media-carousel";
import { buildShowcaseMedia, ProjectArtifactSection } from "@/app/topics/_components/project-showcase-sections";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { buildAdminProgramSidebarItems } from "@/app/topics/_lib/program-sidebar-items";
import { loadProgramSidebarItems } from "@/app/topics/_lib/load-program-sidebar-items";
import { TranslatedText } from "@/app/_components/translated-text";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { ListAdminTopicPreviewService } from "@/modules/topic/application/list-admin-topic-preview";
import { ListPublishedTopicsService } from "@/modules/topic/application/list-published-topics";
import { PrismaTopicQueryRepository } from "@/modules/topic/infrastructure/prisma-topic-query-repository";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {  } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 상세");
}

export default async function TopicDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  const audience = actor.role === "ADMIN" ? "ADMIN" : actor.role === "PROFESSOR" ? "FACULTY" : "STUDENT";
  const archivedProject = await new ListArchivedProjectsService(new PrismaTeamArchiveQueryRepository(prisma, audience)).find(topicId);

  if (archivedProject) {
    const [sidebarItems, ballot] = await Promise.all([
      loadProgramSidebarItems("past", {}, audience),
      new ProjectVotingService(new PrismaProjectVotingRepository(prisma)).getBallot(actor, archivedProject.programId),
    ]);
    return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topicId}`}><ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={archivedProject.programId} showSettings={actor.role === "ADMIN"} />}><ArchivedProjectDetail project={archivedProject} ballot={ballot ?? undefined} /></ExplorerLayout></AppShell>;
  }

  const topicRepository = new PrismaTopicQueryRepository(prisma, audience);
  const topic = actor.role === "ADMIN"
    ? await new ListAdminTopicPreviewService(topicRepository).find(actor, topicId)
    : await new ListPublishedTopicsService(topicRepository).find(topicId);
  if (!topic) notFound();

  const now = new Date();
  const sidebarItems = await (
    actor.role === "ADMIN"
      ? new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listAll(actor).then((programs) => buildAdminProgramSidebarItems(programs, now))
      : loadProgramSidebarItems("active", {}, audience)
  );
  const directApplicationsEnabled = !topic.studentProjectCreationEnabled;
  const { media, embeddedIds, galleryIds } = buildShowcaseMedia({
    artifacts: topic.artifacts,
    title: topic.title,
    thumbnailPath: topic.thumbnailPath,
    posterPath: topic.posterPath,
  });
  const teamLeader = topic.teamMembers?.find(({ role }) => role === "LEADER");
  const teamMembers = topic.teamMembers?.filter(({ role }) => role === "MEMBER") ?? [];

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath={`/topics/${topic.id}`}>
    <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={topic.programId} title={actor.role === "ADMIN" ? "프로그램 관리" : "프로그램"} showSettings={actor.role === "ADMIN"} />}>
      <UiNav aria-label="이전 위치" className="mb-5"><Link href={`/topics?programId=${encodeURIComponent(topic.programId)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"><svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]"><path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg><UiText>{"프로젝트 목록"}</UiText></Link></UiNav>
      <ProjectDetailShell
        heading={<div className="mx-auto w-full max-w-4xl"><p className="text-sm font-semibold text-[var(--muted)]">{topic.programName}{topic.divisionName ? ` · ${topic.divisionName}` : ""}</p><h1 className="mt-3 text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.035em]"><UiText>{topic.title}</UiText></h1><div className="mt-6 space-y-2.5">{topic.studentProjectCreationEnabled ? <>{teamLeader ? <div className="flex flex-wrap items-center gap-2"><span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--primary-hover)] py-1 text-[0.7rem] font-bold text-[var(--primary)]"><UiText>{"팀장"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{teamLeader.name}</span></div> : null}{teamMembers.length ? <div className="flex flex-wrap items-center gap-2"><span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--line)] py-1 text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"팀원"}</UiText></span>{teamMembers.map(({ name }) => <span key={name} className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{name}</span>)}</div> : null}</> : <><div className="flex flex-wrap items-center gap-2"><span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--primary-hover)] py-1 text-[0.7rem] font-bold text-[var(--primary)]"><UiText>{"등록자"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{topic.authorName}</span></div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--line)] py-1 text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"모집 현황"}</UiText></span><span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{topic.memberCount} / {topic.capacity}<UiText>{"명"}</UiText></span></div></>}</div></div>}
      >
        <div className="mx-auto max-w-4xl space-y-11">
          <ProjectMediaCarousel items={media} />
          <section aria-labelledby="topic-description"><h2 id="topic-description" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"프로젝트 소개"}</UiText></h2><TranslatedText text={topic.description} className="mt-3 max-w-3xl whitespace-pre-wrap text-[0.9375rem] leading-7 text-[var(--ink)]" /></section>
          <ProjectArtifactSection artifacts={topic.artifacts} sourceUrl={topic.sourceUrl} embeddedIds={embeddedIds} galleryIds={galleryIds} />
          {directApplicationsEnabled && topic.recruitmentEnabled ? <section aria-labelledby="topic-requirements"><h2 id="topic-requirements" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"지원 조건"}</UiText></h2><dl className="mt-3 border-t border-[var(--line)]">{[["필수 기술", topic.requiredSkills.join(", ") || "별도 조건 없음"], ["우대 기술", topic.preferredSkills.join(", ") || "별도 조건 없음"], ["예상 역할", topic.roleExpectations], ["활동 조건", topic.availabilityRequirement]].map(([label, value]) => <div key={label} className="grid gap-1 border-t border-[var(--line)] py-4 first:border-t-0 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{label}</UiText></dt><dd className="text-sm font-semibold leading-6 text-[var(--ink)]"><UiText>{value}</UiText></dd></div>)}</dl></section> : null}
        </div>
      </ProjectDetailShell>
    </ExplorerLayout>
  </AppShell>;
}
