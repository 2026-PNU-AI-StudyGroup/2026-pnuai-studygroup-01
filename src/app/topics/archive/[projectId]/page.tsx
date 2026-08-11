import Link from "next/link";
import Image from "next/image";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EditorialProjectCover } from "@/app/topics/[topicId]/_components/editorial-project-cover";
import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { loadProgramSidebarItems } from "@/app/topics/_lib/load-program-sidebar-items";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { TranslatedText } from "@/app/_components/translated-text";
import {
  ChevronIcon,
  DocumentIcon,
  ExternalLinkIcon,
  ProjectIcon,
} from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("지난 프로젝트 상세");
}
const artifactType = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

// YouTube watch/short URL을 embed URL로 변환. 실패 시 null.
function toYoutubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default async function ArchivedProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { projectId } = await params;
  const [project, sidebarItems] = await Promise.all([
    new ListArchivedProjectsService(
      new PrismaTeamArchiveQueryRepository(prisma),
    ).find(projectId),
    loadProgramSidebarItems("past"),
  ]);
  if (!project) notFound();
  const skills = [...new Set([...project.requiredSkills, ...project.preferredSkills])];
  const videoArtifacts = project.artifacts
    .map((artifact) => ({ artifact, embedUrl: artifact.type === "PRESENTATION_VIDEO" ? toYoutubeEmbedUrl(artifact.externalUrl) : null }))
    .filter((entry): entry is { artifact: typeof entry.artifact; embedUrl: string } => entry.embedUrl !== null);
  const embeddedIds = new Set(videoArtifacts.map((entry) => entry.artifact.id));
  const linkArtifacts = project.artifacts.filter((artifact) => !embeddedIds.has(artifact.id));
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">
    <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={project.programId} />}>
    <UiNav aria-label="이전 위치" className="mb-5">
      <Link href={`/topics?view=past&programId=${encodeURIComponent(project.programId)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
        <ChevronIcon className="size-4 rotate-180" />
        <UiText>{"지난 프로젝트"}</UiText></Link>
    </UiNav>

    <ProjectDetailShell
      cover={project.thumbnailPath ? (
        <div className="relative min-h-56 bg-[var(--surface-subtle)] lg:min-h-64">
          <Image
            alt={`${project.topicTitle} 대표 이미지`}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 72vw, 100vw"
            src={project.thumbnailPath}
          />
          <span className="absolute left-4 top-4 rounded-[var(--radius-control)] border border-white/60 bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] backdrop-blur">
            {project.startYear} · {project.programName}
          </span>
        </div>
      ) : <EditorialProjectCover label={project.programName} />}
      marker={<ProjectIcon className="size-6" />}
      heading={
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">{project.teamName}{project.advisorEnabled ? ` · ${project.professorName} ${project.advisorRole}` : ""}</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.035em]"><UiText>{project.topicTitle}</UiText></h1>
        </div>
      }
    >
      <div className="max-w-3xl space-y-11">
        {videoArtifacts.length ? (
          <div className="space-y-4">
            {videoArtifacts.map(({ artifact, embedUrl }) => (
              <div key={artifact.id}>
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{artifactType[artifact.type]}</span>
                <div className="mt-1.5 aspect-video w-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-black">
                  <iframe className="size-full" src={embedUrl} title={artifact.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <section aria-labelledby="archive-description">
          <h2 id="archive-description" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"프로젝트 소개"}</UiText></h2>
          <TranslatedText text={project.topicDescription} className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-7 text-[var(--ink)]" />
          {project.posterPath ? (
            <Image
              alt={`${project.topicTitle} 프로젝트 포스터`}
              className="mt-7 h-auto w-full rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]"
              height={1697}
              sizes="(min-width: 1024px) 48rem, 100vw"
              src={project.posterPath}
              width={1200}
            />
          ) : null}
        </section>

        {project.artifacts.length === 0 || linkArtifacts.length > 0 ? (
          <section aria-labelledby="archive-artifacts">
            <h2 id="archive-artifacts" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"공개 결과물"}</UiText></h2>
            {linkArtifacts.length ? (
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {linkArtifacts.map((artifact) => {
                  const interactive = Boolean(artifact.fileId || artifact.externalUrl);
                  const content = (
                    <>
                      <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                        {artifact.type === "SOURCE_CODE"
                          ? <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-current"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.02-1.49-2.22.48-2.69-.94-2.69-.94-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.87.88 2.33.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.27.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
                          : <DocumentIcon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1"><span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{artifactType[artifact.type]}</span><span className="mt-0.5 block truncate text-sm font-semibold text-[var(--ink)]"><UiText>{artifact.title}</UiText></span></span>
                      {interactive ? <ExternalLinkIcon className="size-4 shrink-0 text-[var(--muted)]" /> : null}
                    </>
                  );
                  const base = "flex min-h-16 items-center gap-3 rounded-[var(--radius-control)] border border-[var(--line)] px-3.5 py-3";
                  return <li key={artifact.id}>
                    {artifact.fileId ? <a className={`${base} transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]`} href={`/api/files/${artifact.fileId}`}>{content}</a>
                      : artifact.externalUrl ? <a className={`${base} transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]`} href={artifact.externalUrl} target="_blank" rel="noreferrer">{content}<span className="sr-only"> {" "}<UiText>{"새 창"}</UiText></span></a>
                        : <span className={`${base} text-[var(--muted)]`}>{content}</span>}
                  </li>;
                })}
              </ul>
            ) : <p className="mt-3 text-sm leading-6 text-[var(--muted)]"><UiText>{"공개된 결과물이 없습니다."}</UiText></p>}
          </section>
        ) : null}

        <section aria-labelledby="archive-team">
          <h2 id="archive-team" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"참여자"}</UiText></h2>
          <dl className="mt-3 border-t border-[var(--line)]">
            <div className="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{"참여자"}</UiText></dt>
              <dd className="text-sm font-semibold leading-6 text-[var(--ink)]">{project.memberNames.join(", ")}</dd>
            </div>
            <div className="grid gap-1 border-t border-[var(--line)] py-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{"사용 기술"}</UiText></dt>
              <dd className="text-sm font-semibold leading-6 text-[var(--ink)]"><UiText>{skills.join(", ") || "—"}</UiText></dd>
            </div>
          </dl>
        </section>
      </div>
    </ProjectDetailShell>
    </ExplorerLayout>
  </AppShell>;
}
