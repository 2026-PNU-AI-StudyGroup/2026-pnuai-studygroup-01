import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { canCreateAnnouncement } from "@/modules/announcement/domain/announcement-policy";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import {
  UiDate,
  UiText,
} from "@/modules/translation/ui/i18n-provider";
import { UiNav } from "@/modules/translation/ui/localized-elements";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("공지사항");
}

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new AnnouncementService(
    new PrismaAnnouncementRepository(prisma),
  ).list(requestedPage);

  return (
    <AppShell
      role={actor.role}
      userId={actor.id}
      userName={actor.name}
      currentPath="/announcements"
    >
      <main className="content-shell page-enter pb-28 lg:pb-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <PageHeader
            compact
            title="공지사항"
            actions={canCreateAnnouncement(actor.role) && data.total > 0
              ? <Link className="button-primary" href="/announcements/new"><UiText>{"새 공지 작성"}</UiText></Link>
              : undefined}
          />

          <section aria-labelledby="announcement-list-title" className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-7">
              <h2 id="announcement-list-title" className="text-base font-bold tracking-[-0.02em] text-[var(--ink)]">
                <UiText>{"전체 공지"}</UiText>
              </h2>
              <p className="text-sm font-semibold text-[var(--muted)]">
                <UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{data.total}</strong><UiText>{"건"}</UiText>
              </p>
            </div>

            {data.items.length === 0 ? (
              <div className="px-5 sm:px-7">
                <EmptyState
                  variant="embedded"
                  title="등록된 공지가 없습니다"
                  action={canCreateAnnouncement(actor.role)
                    ? <Link className="button-primary max-sm:w-full" href="/announcements/new"><UiText>{"첫 공지 작성"}</UiText></Link>
                    : undefined}
                />
              </div>
            ) : (
              <ol className="divide-y divide-[var(--line)]">
                {data.items.map((announcement) => (
                  <li key={announcement.id}>
                    <Link
                      href={`/announcements/${announcement.id}`}
                      className="record-row group grid gap-3 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_1.5rem] sm:items-center sm:gap-6 sm:px-7 sm:py-6"
                    >
                      <div className="min-w-0">
                        <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-[var(--ink)] transition-colors group-hover:text-[var(--primary-hover)]">
                          <UiText>{announcement.title}</UiText>
                        </h3>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--muted)] sm:line-clamp-1">
                          <UiText>{announcement.content.replace(/\s+/g, " ")}</UiText>
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--muted)] sm:hidden">
                          <span className="text-[var(--ink)]">{announcement.authorName}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={announcement.createdAt.toISOString()}>
                            <UiDate value={announcement.createdAt} mode="date" />
                          </time>
                        </div>
                      </div>
                      <div className="hidden text-right text-sm sm:block">
                        <p className="font-semibold text-[var(--ink)]">{announcement.authorName}</p>
                        <time className="mt-1 block text-xs text-[var(--muted)]" dateTime={announcement.createdAt.toISOString()}>
                          <UiDate value={announcement.createdAt} mode="date" />
                        </time>
                      </div>
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="hidden size-5 fill-none stroke-[var(--muted)] stroke-2 transition-transform group-hover:translate-x-0.5 group-hover:stroke-[var(--primary)] sm:block">
                        <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {data.totalPages > 1 ? (
            <UiNav aria-label="공지사항 페이지" className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">
                {data.page} / {data.totalPages} <UiText>{"페이지"}</UiText>
              </span>
              <div className="flex gap-2">
                {data.page > 1 ? (
                  <Link className="button-secondary" href={data.page === 2 ? "/announcements" : `/announcements?page=${data.page - 1}`}><UiText>{"이전"}</UiText></Link>
                ) : null}
                {data.page < data.totalPages ? (
                  <Link className="button-secondary" href={`/announcements?page=${data.page + 1}`}><UiText>{"다음"}</UiText></Link>
                ) : null}
              </div>
            </UiNav>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
