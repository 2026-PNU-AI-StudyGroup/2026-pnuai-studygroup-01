import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditorialProjectCover } from "@/app/topics/[topicId]/_components/editorial-project-cover";
import { ProjectDetailShell } from "@/app/topics/_components/project-detail-shell";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "지난 프로젝트 상세" };
const artifactType = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export default async function ArchivedProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { projectId } = await params;
  const project = await new ListArchivedProjectsService(
    new PrismaTeamArchiveQueryRepository(prisma),
  ).find(projectId);
  if (!project) notFound();
  const skills = [...new Set([...project.requiredSkills, ...project.preferredSkills])];
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics"><main className="content-shell">
    <nav aria-label="이전 위치" className="mb-5">
      <Link href="/topics?view=past" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]"><path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        지난 프로젝트
      </Link>
    </nav>

    <ProjectDetailShell
      cover={<EditorialProjectCover id={project.id} label={`${project.academicYear} · ${project.programName}`} />}
      marker={
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.75]"><path d="M4 7h16v12H4zM8 7V4h8v3M9 12h6" /></svg>
      }
      heading={
        <div>
          <p className="text-sm font-bold text-[var(--muted)]">{project.teamName} · {project.professorName} 교수</p>
          <h1 className="mt-4 max-w-5xl text-[clamp(2.45rem,5vw,4.25rem)] font-black leading-[1.03] tracking-[-0.055em]">{project.topicTitle}</h1>
        </div>
      }
      railLabelledBy="archive-artifacts"
      rail={
        <>
          <h2 id="archive-artifacts" className="text-xl font-black">공개 결과물</h2>
          {project.artifacts.length ? (
            <ul className="mt-5 border-y border-[var(--line)]">
              {project.artifacts.map((artifact) => {
                const content = (
                  <>
                    <span className="grid size-9 shrink-0 place-items-center bg-[var(--surface-subtle)] text-[var(--primary)]">
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]"><path d="M5 2.5h6l4 4v11H5zM11 2.5v4h4" /></svg>
                    </span>
                    <span className="min-w-0"><span className="block text-xs text-[var(--muted)]">{artifactType[artifact.type]}</span><span className="mt-0.5 block truncate font-bold">{artifact.title}</span></span>
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-auto size-4 shrink-0 fill-none stroke-current stroke-[1.75]"><path d="M7 5h8v8M15 5 6 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </>
                );
                return <li key={artifact.id} className="border-t border-[var(--line)] first:border-t-0">
                  {artifact.fileId ? <a className="flex min-h-16 items-center gap-3 py-3 text-sm text-[var(--primary-hover)]" href={`/api/files/${artifact.fileId}`}>{content}</a>
                    : artifact.externalUrl ? <a className="flex min-h-16 items-center gap-3 py-3 text-sm text-[var(--primary-hover)]" href={artifact.externalUrl} target="_blank" rel="noreferrer">{content}<span className="sr-only"> 새 창</span></a>
                      : <span className="flex min-h-16 items-center gap-3 py-3 text-sm text-[var(--muted)]">{content}</span>}
                </li>;
              })}
            </ul>
          ) : <p className="mt-4 text-sm leading-6 text-[var(--muted)]">공개된 결과물이 없습니다.</p>}
        </>
      }
    >
      <div className="space-y-12">
        <section aria-labelledby="archive-description">
          <h2 id="archive-description" className="text-2xl font-black tracking-[-0.035em]">프로젝트 이야기</h2>
          <TranslatedText text={project.topicDescription} className="mt-5 max-w-3xl whitespace-pre-wrap text-[1.05rem] leading-8 text-[var(--muted)]" />
        </section>

        <section aria-labelledby="archive-team">
          <h2 id="archive-team" className="text-2xl font-black tracking-[-0.035em]">함께 만든 사람들</h2>
          <dl className="mt-5 border-y border-[var(--line)]">
            <div className="grid gap-2 py-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-sm font-bold text-[var(--muted)]">참여자</dt>
              <dd className="font-semibold leading-7">{project.memberNames.join(", ")}</dd>
            </div>
            <div className="grid gap-2 border-t border-[var(--line)] py-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-sm font-bold text-[var(--muted)]">사용 기술</dt>
              <dd className="font-semibold leading-7">{skills.join(", ") || "공개된 기술 정보 없음"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </ProjectDetailShell>
  </main></AppShell>;
}
