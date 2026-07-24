import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveRepository } from "@/modules/team/infrastructure/prisma-team-archive-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { PageHeader } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

export const metadata: Metadata = { title: "지난 프로젝트 상세" };
const artifactType = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export default async function ArchivedProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { projectId } = await params;
  const project = await new ListArchivedProjectsService(new PrismaTeamArchiveRepository(prisma)).find(projectId);
  if (!project) notFound();
  const skills = [...new Set([...project.requiredSkills, ...project.preferredSkills])];
  return <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/topics"><main className="content-shell space-y-10">
    <PageHeader eyebrow={`${project.academicYear} · ${project.programName}`} title={project.topicTitle} description={`${project.teamName} · ${project.professorName} 교수`} actions={<Link href="/topics?view=past" className="button-secondary">지난 프로젝트 목록</Link>} />
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-10"><section aria-labelledby="archive-description"><h2 id="archive-description" className="text-xl font-extrabold">프로젝트 설명</h2><TranslatedText text={project.topicDescription} className="muted mt-4 whitespace-pre-wrap leading-8" /></section><section aria-labelledby="archive-team"><h2 id="archive-team" className="text-xl font-extrabold">참여 정보</h2><dl className="mt-5 grid gap-5 border-y border-[var(--line)] py-6 sm:grid-cols-2"><div><dt className="muted text-xs">참여자</dt><dd className="mt-2 font-semibold leading-7">{project.memberNames.join(", ")}</dd></div><div><dt className="muted text-xs">기술</dt><dd className="mt-2 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold">{skill}</span>)}</dd></div></dl></section></div>
      <aside aria-labelledby="archive-artifacts" className="border-t border-[var(--line)] pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h2 id="archive-artifacts" className="text-xl font-extrabold">공개 결과물</h2>{project.artifacts.length ? <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">{project.artifacts.map((artifact) => <li key={artifact.id}>{artifact.fileId ? <a className="button-quiet min-h-14 w-full justify-start px-0 text-left text-[var(--primary)]" href={`/api/files/${artifact.fileId}`}>{artifactType[artifact.type]} · {artifact.title}</a> : artifact.externalUrl ? <a className="button-quiet min-h-14 w-full justify-start px-0 text-left text-[var(--primary)]" href={artifact.externalUrl} target="_blank" rel="noreferrer">{artifactType[artifact.type]} · {artifact.title}<span className="sr-only"> 새 창</span></a> : <span className="muted flex min-h-14 items-center text-sm">{artifactType[artifact.type]} · {artifact.title}</span>}</li>)}</ul> : <p className="muted mt-4 text-sm">공개된 결과물이 없습니다.</p>}</aside>
    </div>
  </main></AppShell>;
}
