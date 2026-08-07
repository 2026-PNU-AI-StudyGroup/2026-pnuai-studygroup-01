import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ShowcaseEditor, type ShowcaseEditorData } from "@/app/showcase/_components/showcase-editor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";
import { PageHeader } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("쇼케이스 편집");
}

export default async function ShowcaseEditPage({ params }: { params: Promise<{ teamId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true, professorId: true, topic: { select: { title: true } } },
  });
  if (!team) notFound();

  const canEdit =
    actor.role === "ADMIN" ||
    team.professorId === actor.id ||
    Boolean(await prisma.teamMember.findFirst({ where: { teamId, studentId: actor.id }, select: { id: true } }));
  if (!canEdit) notFound();

  const showcase = await prisma.projectShowcase.findUnique({
    where: { teamId },
    select: {
      summary: true,
      githubUrl: true,
      youtubeUrl: true,
      demoUrl: true,
      isPublished: true,
      images: { orderBy: { position: "asc" }, select: { id: true, isCover: true } },
    },
  });

  const data: ShowcaseEditorData = {
    teamId,
    summary: showcase?.summary ?? "",
    githubUrl: showcase?.githubUrl ?? null,
    youtubeUrl: showcase?.youtubeUrl ?? null,
    demoUrl: showcase?.demoUrl ?? null,
    isPublished: showcase?.isPublished ?? false,
    images: showcase?.images ?? [],
  };

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Brand href="/topics" />
          <UiLink href={`/showcase/${teamId}`} className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
            <UiText>{"공개 페이지 보기"}</UiText>
          </UiLink>
        </div>
      </header>
      <main className="mx-auto grid max-w-4xl gap-8 px-5 py-8 sm:px-8 sm:py-10">
        <PageHeader eyebrow={team.topic.title} title="프로젝트 쇼케이스 편집" description="프로젝트 소개와 링크, 이미지를 등록하고 공개 여부를 설정합니다." />
        <ShowcaseEditor data={data} />
      </main>
    </div>
  );
}
