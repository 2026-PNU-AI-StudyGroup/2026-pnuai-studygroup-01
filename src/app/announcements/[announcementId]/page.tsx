import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { DeleteAnnouncementForm } from "@/app/announcements/_components/delete-announcement-form";
import {
  AnnouncementNotFoundError,
  AnnouncementService,
} from "@/modules/announcement/application/manage-announcements";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import {
  UiDate,
  UiText,
} from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("공지사항 상세");
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { announcementId } = await params;
  const service = new AnnouncementService(
    new PrismaAnnouncementRepository(prisma),
  );
  let announcement;
  try {
    announcement = await service.get(announcementId);
  } catch (error) {
    if (error instanceof AnnouncementNotFoundError) notFound();
    throw error;
  }
  const canManage = service.canManage(actor, announcement);
  const wasUpdated = announcement.updatedAt.getTime() !== announcement.createdAt.getTime();

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath={`/announcements/${announcement.id}`}
    >
      <main className="content-shell page-enter">
        <article className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
            <Link className="button-quiet" href="/announcements"><UiText>{"공지 목록"}</UiText></Link>
            {canManage ? (
              <div className="flex items-start gap-2">
                <Link className="button-secondary" href={`/announcements/${announcement.id}/edit`}><UiText>{"수정"}</UiText></Link>
                <DeleteAnnouncementForm announcementId={announcement.id} />
              </div>
            ) : null}
          </div>

          <header className="border-b border-[var(--line)] py-8 sm:py-10">
            <p className="text-xs font-black tracking-[0.14em] text-[var(--primary)]">
              <UiText>{"공지사항"}</UiText>
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-black leading-[1.15] tracking-[-0.05em]">
              <UiText>{announcement.title}</UiText>
            </h1>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]">{announcement.authorName}</span>
              <time dateTime={announcement.createdAt.toISOString()}>
                <UiDate value={announcement.createdAt} mode="dateTime" />
              </time>
              {wasUpdated ? (
                <span><UiText>{"수정"}</UiText>{" "}<UiDate value={announcement.updatedAt} mode="dateTime" /></span>
              ) : null}
            </div>
          </header>

          <div className="min-h-72 whitespace-pre-wrap py-8 text-base leading-8 text-[var(--ink)] sm:py-10">
            <UiText>{announcement.content}</UiText>
          </div>
        </article>
      </main>
    </AppShell>
  );
}
