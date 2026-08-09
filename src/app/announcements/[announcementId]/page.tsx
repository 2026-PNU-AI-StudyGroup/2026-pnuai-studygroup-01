import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { DeleteAnnouncementForm } from "@/app/announcements/_components/delete-announcement-form";
import { AnnouncementScopeBadge } from "@/app/announcements/_components/announcement-scope-badge";
import {
  ANNOUNCEMENT_CATEGORY_BADGE,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from "@/app/announcements/_lib/announcement-categories";
import { resolveAnnouncementAudience } from "@/app/announcements/_lib/announcement-audience";
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
import { IconLink } from "@/shared/ui/icon-button";
import { EditIcon } from "@/shared/ui/workspace-icons";

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
  const audience = await resolveAnnouncementAudience(actor);
  if (!service.canView(audience, announcement)) notFound();
  const canManage = service.canManage(actor, announcement);
  const wasUpdated = announcement.updatedAt.getTime() !== announcement.createdAt.getTime();

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath={`/announcements/${announcement.id}`}
    >
      <main className="content-shell page-enter pb-28 lg:pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link className="button-quiet" href="/announcements"><UiText>{"공지 목록"}</UiText></Link>
            {canManage ? (
              <div className="flex items-start gap-2">
                <IconLink href={`/announcements/${announcement.id}/edit`} aria-label="공지 수정" title="공지 수정"><EditIcon className="size-5" /></IconLink>
                <DeleteAnnouncementForm announcementId={announcement.id} />
              </div>
            ) : null}
          </div>
          <article className="panel overflow-hidden">
            <header className="border-b border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${ANNOUNCEMENT_CATEGORY_BADGE[announcement.category]}`}>
                  <UiText>{ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}</UiText>
                </span>
                <AnnouncementScopeBadge teamName={announcement.teamName} programName={announcement.programName} />
              </div>
              <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.2] tracking-[-0.045em] text-[var(--ink)]">
                <UiText>{announcement.title}</UiText>
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
                <span className="font-semibold text-[var(--ink)]">{announcement.authorName}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={announcement.createdAt.toISOString()}>
                  <UiDate value={announcement.createdAt} mode="dateTime" />
                </time>
                {wasUpdated ? (
                  <><span aria-hidden="true">·</span><span><UiText>{"수정"}</UiText>{" "}<UiDate value={announcement.updatedAt} mode="dateTime" /></span></>
                ) : null}
              </div>
            </header>

            <div className="min-h-72 whitespace-pre-wrap px-5 py-8 text-base leading-8 text-[var(--ink)] sm:px-8 sm:py-10">
              <UiText>{announcement.content}</UiText>
            </div>
          </article>
        </div>
      </main>
    </AppShell>
  );
}
