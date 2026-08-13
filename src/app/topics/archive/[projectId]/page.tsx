import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { ProjectMediaCarousel, type ProjectMediaItem } from "@/app/topics/_components/project-media-carousel";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";
import { ProgramSidebar } from "@/app/topics/_components/program-sidebar";
import { loadProgramSidebarItems } from "@/app/topics/_lib/load-program-sidebar-items";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { renderMarkdown } from "@/shared/ui/render-markdown";
import {
  ChevronIcon,
  DocumentIcon,
  ExternalLinkIcon,
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

// GitHub 저장소 URL에서 owner/repo 추출. 실패 시 null.
function parseGithubRepo(url: string | null | undefined): { owner: string; repo: string } | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/\s]+)\/([^/?#\s]+)/i);
  return match ? { owner: match[1], repo: match[2].replace(/\.git$/i, "") } : null;
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className}>
      <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.02-1.49-2.22.48-2.69-.94-2.69-.94-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.87.88 2.33.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.27.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
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

  // 대표 미디어(이미지·유튜브)를 하나의 캐러셀로: 대표 이미지 → 발표 영상 → 포스터 순.
  const videoArtifacts = project.artifacts
    .map((artifact) => ({ artifact, embedUrl: artifact.type === "PRESENTATION_VIDEO" ? toYoutubeEmbedUrl(artifact.externalUrl) : null }))
    .filter((entry): entry is { artifact: typeof entry.artifact; embedUrl: string } => entry.embedUrl !== null);
  const embeddedIds = new Set(videoArtifacts.map((entry) => entry.artifact.id));
  const media: ProjectMediaItem[] = [
    ...(project.thumbnailPath ? [{ kind: "image" as const, src: project.thumbnailPath, alt: `${project.topicTitle} 대표 이미지` }] : []),
    ...videoArtifacts.map(({ artifact, embedUrl }) => ({ kind: "video" as const, embedUrl, title: artifact.title })),
    ...(project.posterPath ? [{ kind: "image" as const, src: project.posterPath, alt: `${project.topicTitle} 프로젝트 포스터` }] : []),
  ];

  // GitHub 저장소: 프로젝트 sourceUrl 우선, 없으면 소스 코드 아티팩트에서 찾는다.
  const githubArtifact = project.artifacts.find((artifact) => artifact.type === "SOURCE_CODE" && /github\.com/i.test(artifact.externalUrl ?? ""));
  const githubUrl = /github\.com/i.test(project.sourceUrl ?? "") ? project.sourceUrl : githubArtifact?.externalUrl;
  const github = parseGithubRepo(githubUrl);
  const githubArtifactId = github && githubUrl === githubArtifact?.externalUrl ? githubArtifact?.id : undefined;

  // 나머지 첨부 자료(임베드 영상·GitHub 카드 제외)를 다운로드 칩으로.
  const resourceArtifacts = project.artifacts.filter((artifact) => !embeddedIds.has(artifact.id) && artifact.id !== githubArtifactId);
  const hasResults = Boolean(github) || resourceArtifacts.length > 0;

  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">
    <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={project.programId} />}>
    <UiNav aria-label="이전 위치" className="mb-5">
      <Link href={`/topics?view=past&programId=${encodeURIComponent(project.programId)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
        <ChevronIcon className="size-4 rotate-180" />
        <UiText>{"지난 프로젝트"}</UiText></Link>
    </UiNav>

    <ProjectDetailShell
      heading={
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm font-semibold text-[var(--muted)]">{project.startYear} · {project.programName} · {project.teamName}{project.divisionName ? ` · ${project.divisionName}` : ""}</p>
          <h1 className="mt-3 text-[clamp(1.5rem,2.8vw,2.125rem)] font-bold leading-[1.15] tracking-[-0.035em]"><UiText>{project.topicTitle}</UiText></h1>
          <div className="mt-6 space-y-2.5">
            {project.memberNames[0] ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--primary-hover)] py-1 text-[0.7rem] font-bold text-[var(--primary)]"><UiText>{"팀장"}</UiText></span>
                <span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{project.memberNames[0]}</span>
              </div>
            ) : null}
            {project.memberNames.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--line)] py-1 text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"팀원"}</UiText></span>
                {project.memberNames.slice(1).map((name) => (
                  <span key={name} className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{name}</span>
                ))}
              </div>
            ) : null}
            {project.advisorEnabled ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-16 shrink-0 items-center justify-center rounded-full border border-[var(--line)] py-1 text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"지도교수"}</UiText></span>
                <span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">{project.professorName} {project.advisorRole}</span>
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-11">
        {media.length ? <ProjectMediaCarousel items={media} /> : null}

        <section aria-labelledby="archive-description">
          <h2 id="archive-description" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"프로젝트 소개"}</UiText></h2>
          <div className="mt-3 space-y-3 text-[0.9375rem] text-[var(--ink)]">{renderMarkdown(project.topicDescription)}</div>
        </section>

        <section aria-labelledby="archive-artifacts">
          <h2 id="archive-artifacts" className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><UiText>{"공개 결과물"}</UiText></h2>
          {hasResults ? (
            <div className="mt-3 space-y-3">
              {github ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] p-4 transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--ink)] text-white">
                    <GithubIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--ink)]">{github.owner}/{github.repo}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--muted)]"><UiText>{"GitHub 저장소"}</UiText></span>
                  </span>
                  <ExternalLinkIcon className="size-4 shrink-0 text-[var(--muted)]" />
                </a>
              ) : null}
              {resourceArtifacts.length ? (
                <ul className="flex flex-wrap gap-2">
                  {resourceArtifacts.map((artifact) => {
                    const href = artifact.fileId ? `/api/files/${artifact.fileId}` : artifact.externalUrl;
                    const chip = (
                      <>
                        {artifact.type === "SOURCE_CODE" ? <GithubIcon className="size-4 shrink-0" /> : <DocumentIcon className="size-4 shrink-0 text-[var(--muted)]" />}
                        <span className="truncate text-sm font-semibold text-[var(--ink)]"><UiText>{artifact.title}</UiText></span>
                        <span className="shrink-0 text-[0.6875rem] font-semibold text-[var(--muted)]">{artifactType[artifact.type]}</span>
                        {href ? <ExternalLinkIcon className="size-3.5 shrink-0 text-[var(--muted)]" /> : null}
                      </>
                    );
                    const base = "inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--line)] px-3.5 py-2";
                    return (
                      <li key={artifact.id}>
                        {artifact.fileId ? (
                          <a className={`${base} transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]`} href={`/api/files/${artifact.fileId}`}>{chip}</a>
                        ) : artifact.externalUrl ? (
                          <a className={`${base} transition-colors hover:border-[var(--field-border)] hover:bg-[var(--surface-subtle)]`} href={artifact.externalUrl} target="_blank" rel="noreferrer">{chip}<span className="sr-only"> <UiText>{"새 창"}</UiText></span></a>
                        ) : (
                          <span className={`${base} text-[var(--muted)]`}>{chip}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : <p className="mt-3 text-sm leading-6 text-[var(--muted)]"><UiText>{"공개된 결과물이 없습니다."}</UiText></p>}
        </section>
      </div>
    </ProjectDetailShell>
    </ExplorerLayout>
  </AppShell>;
}
