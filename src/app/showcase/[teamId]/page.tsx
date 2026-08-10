import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShowcaseComments, ShowcaseLikeButton } from "@/app/showcase/_components/showcase-social";
import { toYoutubeEmbedUrl } from "@/app/showcase/_lib/showcase-options";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Brand } from "@/shared/ui/brand";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 쇼케이스");
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} target="_blank" rel="noreferrer noopener" className="button-secondary">
      <UiText>{label}</UiText>
    </Link>
  );
}

export default async function ShowcaseDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const actor = await getCurrentActor();
  const showcase = await prisma.projectShowcase.findUnique({
    where: { teamId },
    select: {
      id: true,
      isPublished: true,
      summary: true,
      githubUrl: true,
      youtubeUrl: true,
      demoUrl: true,
      awardName: true,
      awardColor: true,
      images: { orderBy: { position: "asc" }, select: { id: true } },
      comments: { orderBy: { createdAt: "desc" }, select: { id: true, authorId: true, authorName: true, body: true, createdAt: true } },
      _count: { select: { likes: true } },
    },
  });
  if (!showcase || !showcase.isPublished) notFound();

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true, topic: { select: { title: true } } },
  });
  if (!team) notFound();

  const likedByMe = actor
    ? Boolean(await prisma.showcaseLike.findUnique({
        where: { showcaseId_userId: { showcaseId: showcase.id, userId: actor.id } },
        select: { id: true },
      }))
    : false;

  const embedUrl = toYoutubeEmbedUrl(showcase.youtubeUrl);

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Brand href="/" />
          <UiLink href="/showcase" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
            <UiText>{"갤러리로"}</UiText>
          </UiLink>
        </div>
      </header>
      <main className="mx-auto grid max-w-4xl gap-8 px-5 py-8 sm:px-8 sm:py-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold tracking-[0.14em] text-[var(--primary)]">{team.name}</p>
            {showcase.awardName ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ backgroundColor: showcase.awardColor ?? "var(--primary)" }}>
                {showcase.awardName}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.04em]"><UiText>{team.topic.title}</UiText></h1>
          <div className="mt-4">
            <ShowcaseLikeButton teamId={teamId} liked={likedByMe} count={showcase._count.likes} />
          </div>
        </div>

        {(showcase.githubUrl || showcase.demoUrl || showcase.youtubeUrl) ? (
          <div className="flex flex-wrap gap-2">
            {showcase.githubUrl ? <LinkButton href={showcase.githubUrl} label="GitHub" /> : null}
            {showcase.demoUrl ? <LinkButton href={showcase.demoUrl} label="데모·사이트" /> : null}
            {showcase.youtubeUrl && !embedUrl ? <LinkButton href={showcase.youtubeUrl} label="YouTube" /> : null}
          </div>
        ) : null}

        {embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-black focus-within:border-[var(--focus)] focus-within:ring-4 focus-within:ring-[var(--focus-halo)]">
            <iframe src={embedUrl} title="프로젝트 소개 영상" className="h-full w-full" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : null}

        <section>
          <h2 className="text-xl font-bold tracking-[-0.02em]"><UiText>{"프로젝트 소개"}</UiText></h2>
          <p className="mt-4 whitespace-pre-wrap text-[1.02rem] leading-8 text-[var(--muted)]">{showcase.summary}</p>
        </section>

        {showcase.images.length ? (
          <section>
            <h2 className="text-xl font-bold tracking-[-0.02em]"><UiText>{"이미지"}</UiText></h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {showcase.images.map((image) => (
                <li key={image.id} className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/showcase-images/${image.id}`} alt="" className="w-full object-cover" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ShowcaseComments
          teamId={teamId}
          comments={showcase.comments}
          currentUserId={actor?.id ?? null}
          isAdmin={actor?.role === "ADMIN"}
        />
      </main>
    </div>
  );
}
