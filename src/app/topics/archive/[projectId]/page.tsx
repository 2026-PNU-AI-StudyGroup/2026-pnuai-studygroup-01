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
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics">
    <ExplorerLayout sidebar={<ProgramSidebar items={sidebarItems} selectedId={project.programId} allHref="/topics?view=past" />}>
    <UiNav aria-label="이전 위치" className="mb-5">
      <Link href={`/topics?view=past&programId=${encodeURIComponent(project.programId)}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
        <ChevronIcon className="size-4 rotate-180" />
        <UiText>{"지난 프로젝트"}</UiText></Link>
    </UiNav>

    <ProjectDetailShell
      cover={project.thumbnailPath ? (
        <div className="relative min-h-64 bg-[var(--surface-subtle)] lg:min-h-72">
          <Image
            alt={`${project.topicTitle} 대표 이미지`}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 72vw, 100vw"
            src={project.thumbnailPath}
          />
          <span className="absolute left-4 top-4 rounded-lg border border-white/60 bg-white/85 px-3 py-2 text-xs font-bold text-[var(--ink)] backdrop-blur">
            {project.academicYear} · {project.programName}
          </span>
        </div>
      ) : <EditorialProjectCover id={project.id} label={`${project.academicYear} · ${project.programName}`} />}
      marker={
        <ProjectIcon className="size-6" />
      }
      heading={
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">{project.teamName}{project.advisorEnabled ? ` · ${project.professorName} ${project.advisorRole}` : ""}</p>
          <h1 className="mt-4 max-w-5xl text-[clamp(2.45rem,5vw,4.25rem)] font-bold leading-[1.03] tracking-[-0.055em]"><UiText>{project.topicTitle}</UiText></h1>
        </div>
      }
      railLabelledBy="archive-artifacts"
      rail={
        <>
          <h2 id="archive-artifacts" className="text-xl font-bold"><UiText>{"공개 결과물"}</UiText></h2>
          {project.artifacts.length ? (
            <ul className="mt-5 border-y border-[var(--line)]">
              {project.artifacts.map((artifact) => {
                const content = (
                  <>
                    <span className="grid size-9 shrink-0 place-items-center bg-[var(--surface-subtle)] text-[var(--primary)]">
                      <DocumentIcon className="size-4" />
                    </span>
                    <span className="min-w-0"><span className="block text-xs text-[var(--muted)]">{artifactType[artifact.type]}</span><span className="mt-0.5 block truncate font-semibold"><UiText>{artifact.title}</UiText></span></span>
                    <ExternalLinkIcon className="ml-auto size-4 shrink-0" />
                  </>
                );
                return <li key={artifact.id} className="border-t border-[var(--line)] first:border-t-0">
                  {artifact.fileId ? <a className="flex min-h-16 items-center gap-3 py-3 text-sm text-[var(--primary-hover)]" href={`/api/files/${artifact.fileId}`}>{content}</a>
                    : artifact.externalUrl ? <a className="flex min-h-16 items-center gap-3 py-3 text-sm text-[var(--primary-hover)]" href={artifact.externalUrl} target="_blank" rel="noreferrer">{content}<span className="sr-only"> {" "}<UiText>{"새 창"}</UiText></span></a>
                      : <span className="flex min-h-16 items-center gap-3 py-3 text-sm text-[var(--muted)]">{content}</span>}
                </li>;
              })}
            </ul>
          ) : <p className="mt-4 text-sm leading-6 text-[var(--muted)]"><UiText>{"공개된 결과물이 없습니다."}</UiText></p>}
        </>
      }
    >
      <div className="space-y-12">
        <section aria-labelledby="archive-description">
          <h2 id="archive-description" className="text-2xl font-bold tracking-[-0.035em]"><UiText>{"프로젝트 이야기"}</UiText></h2>
          <TranslatedText text={project.topicDescription} className="mt-5 max-w-3xl whitespace-pre-wrap text-[1.05rem] leading-8 text-[var(--muted)]" />
          {project.posterPath ? (
            <Image
              alt={`${project.topicTitle} 프로젝트 포스터`}
              className="mt-8 h-auto w-full max-w-3xl border border-[var(--line)] bg-white"
              height={1697}
              sizes="(min-width: 1024px) 52rem, 100vw"
              src={project.posterPath}
              width={1200}
            />
          ) : null}
        </section>

        <section aria-labelledby="archive-team">
          <h2 id="archive-team" className="text-2xl font-bold tracking-[-0.035em]"><UiText>{"함께 만든 사람들"}</UiText></h2>
          <dl className="mt-5 border-y border-[var(--line)]">
            <div className="grid gap-2 py-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{"참여자"}</UiText></dt>
              <dd className="font-semibold leading-7">{project.memberNames.join(", ")}</dd>
            </div>
            <div className="grid gap-2 border-t border-[var(--line)] py-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-sm font-semibold text-[var(--muted)]"><UiText>{"사용 기술"}</UiText></dt>
              <dd className="font-semibold leading-7"><UiText>{skills.join(", ") || "공개된 기술 정보 없음"}</UiText></dd>
            </div>
          </dl>
        </section>
      </div>
    </ProjectDetailShell>
    </ExplorerLayout>
  </AppShell>;
}
